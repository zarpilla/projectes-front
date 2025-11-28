<template>
  <div>
    <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
      <div class="modal-card modal-card-diet">
        <header class="modal-card-head">
          <p class="modal-card-title">Nova Dieta</p>
        </header>
        <form @submit.prevent="submit">
          <section class="modal-card-body">
          <p class="mb-3 has-text-weight-bold">
            Introdueix les dades de la dieta per als quilòmetres realitzats.
          </p>

          <b-field label="Persona" horizontal :message="selectedUserIrpf ? `IRPF ${selectedUserIrpf} %` : ''">
            <b-autocomplete
              v-model="userSearch"
              placeholder="Escriu el nom..."
              :keep-first="false"
              :open-on-focus="true"
              :data="filteredUsers"
              field="displayName"
              @select="userSelected"
              :clearable="true"
              required
            >
            </b-autocomplete>
          </b-field>

          <b-field label="Projecte" horizontal>
            <b-autocomplete
              v-model="projectSearch"
              placeholder="Escriu el nom del projecte..."
              :keep-first="false"
              :open-on-focus="true"
              :data="filteredProjects"
              field="name"
              @select="projectSelected"
              :clearable="true"
              required
            >
            </b-autocomplete>
          </b-field>

          <b-field 
            v-if="form.project && form.project.name"
            label="Projecte seleccionat" 
            horizontal
          >
            <div class="tag is-primary">
              {{ form.project.name }}
            </div>
          </b-field>

          <b-field label="Concepte" horizontal>
            <b-input
              v-model="form.concept"
              placeholder="Descriu el motiu de la dieta..."
              required
              expanded
            >
            </b-input>
          </b-field>

          <b-field label="Quilòmetres" horizontal>
            <b-input
              v-model="form.kilometers"
              type="number"
              placeholder="Introdueix els quilòmetres"
              min="0"
              step="1"
              required
              expanded
            >
            </b-input>
          </b-field>

          <b-field label="Data" horizontal>
            <b-datepicker
              v-model="form.date"
              :show-week-number="false"
              :locale="'ca-ES'"
              :first-day-of-week="1"
              icon="calendar-today"
              placeholder="Selecciona la data"
              trap-focus
              editable
              required
            >
            </b-datepicker>
          </b-field>

          <div v-if="form.kilometers > 0" class="has-background-light p-4 mt-4">
            <p class="has-text-weight-bold mb-2">Resum del càlcul:</p>
            <p>Quilòmetres: {{ form.kilometers }}</p>
            <p>Import sense IRPF: {{ dietAmountWithoutIrpf.toFixed(2) }} €</p>
            <p>Import amb IRPF: {{ dietAmountWithIrpf.toFixed(2) }} €</p>
            <p class="has-text-weight-bold">Total: {{ totalDietAmount.toFixed(2) }} €</p>
          </div>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="cancel">
            Cancel·lar
          </button>
          <button 
            class="button is-primary" 
            native-type="submit"
            :disabled="!isFormValid"
          >
            Crear Dieta
          </button>
        </footer>
      </form>
    </div>
  </b-modal>
  </div>
</template>

<script>
import service from "@/service/index";

export default {
  name: "ModalBoxDiet",
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    users: {
      type: Array,
      default: () => []
    },
    projects: {
      type: Array,
      default: () => []
    },
    quotes: {
      type: Object,
      default: null
    },
    currentUser: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      isModalActive: this.isActive || false,
      form: {
        user: null,
        project: null,
        concept: "",
        kilometers: 0,
        date: new Date()
      },
      projectSearch: "",
      userSearch: "",
      availableUsers: [],
      selectedUserIrpf: 0
    };
  },
  computed: {
    filteredProjects() {
      return this.projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredUsers() {
      return this.availableUsers.filter(user => {
        const searchTerm = this.userSearch.toLowerCase();
        return (
          (user.username && user.username.toLowerCase().indexOf(searchTerm) >= 0) ||
          (user.name && user.name.toLowerCase().indexOf(searchTerm) >= 0)
        );
      }).map(user => ({
        ...user,
        displayName: user.username || user.name
      }));
    },
    dietAmountWithoutIrpf() {
      if (!this.quotes || !this.form.kilometers) return 0;
      return parseFloat((this.form.kilometers * (this.quotes.diet_amount_without_irpf || 0)).toFixed(2));
    },
    dietAmountWithIrpf() {
      if (!this.quotes || !this.form.kilometers) return 0;
      const totalPerKm = this.quotes.diet_amount_total || 0;
      const withoutIrpfPerKm = this.quotes.diet_amount_without_irpf || 0;
      const withIrpfPerKm = parseFloat((totalPerKm - withoutIrpfPerKm).toFixed(4)); // More precision for per-km calculation
      return parseFloat((this.form.kilometers * withIrpfPerKm).toFixed(2));
    },
    totalDietAmount() {
      return this.dietAmountWithoutIrpf + this.dietAmountWithIrpf;
    },
    isFormValid() {
      return (
        this.form.user &&
        this.form.project &&
        this.form.concept &&
        this.form.concept.trim().length > 0 &&
        this.form.kilometers > 0 &&
        this.form.date
      );
    }
  },
  watch: {
    isActive: {
      immediate: true,
      handler(newValue) {
        console.log('ModalBoxDiet isActive changed to:', newValue);
        this.isModalActive = newValue;
        if (newValue) {
          console.log('Calling show() method');
          this.show();
        } else {
          this.cancel();
        }
      }
    },
    'form.date'() {
      // Recalculate IRPF when date changes
      if (this.form.user) {
        this.calculateUserIRPF(this.form.user);
      }
    }
  },
  methods: {
    async show() {
      console.log('ModalBoxDiet show() called');
      console.log('currentUser:', this.currentUser);
      console.log('quotes:', this.quotes);
      
      // Set default user to current user if available
      if (this.currentUser && this.currentUser.id) {
        this.form.user = this.currentUser.id;
      }
      
      // Load users that have permission (users_permissions_user)
      await this.loadAvailableUsers();
      console.log('availableUsers loaded:', this.availableUsers);
      
      // Calculate IRPF for default user if set
      if (this.form.user) {
        await this.calculateUserIRPF(this.form.user);
      }
    },
    async loadAvailableUsers() {
      try {
        // Load users that can be used for diet documents
        // These should be users with users_permissions_user value
        const response = await service({ requiresAuth: true }).get(
          "contacts/basic?_limit=-1&_sort=name:ASC&_where[users_permissions_user_null]=false"
        );
        
        // Create a map to avoid duplicates and ensure unique IDs
        const userMap = new Map();
        
        response.data.forEach(contact => {
          if (contact.users_permissions_user && contact.users_permissions_user.id) {
            const userId = contact.users_permissions_user.id;
            if (!userMap.has(userId)) {
              userMap.set(userId, {
                id: userId,
                username: contact.users_permissions_user.username || contact.name,
                name: contact.name,
                contact_id: contact.id
              });
            }
          }
        });
        
        // Convert map to array
        this.availableUsers = Array.from(userMap.values());
        
        console.log('Available users after deduplication:', this.availableUsers);

        // If current user is available, set as default
        if (this.currentUser) {
          const currentUserInList = this.availableUsers.find(
            u => u.id === this.currentUser.id
          );
          if (currentUserInList) {
            this.form.user = this.currentUser.id;
            this.userSearch = currentUserInList.username || currentUserInList.name;
          }
        }
      } catch (error) {
        console.error("Error loading available users:", error);
        // Fallback: use the passed users prop
        this.availableUsers = this.users || [];
      }
    },
    projectSelected(project) {
      if (project) {
        this.form.project = project;
        this.projectSearch = project.name;
      }
    },
    userSelected(user) {
      console.log('User selected via autocomplete:', user);
      if (user) {
        this.form.user = user.id;
        this.userSearch = user.displayName;
        this.calculateUserIRPF(user.id);
      }
    },
    async onUserSelected(userId) {
      console.log('User selected:', userId);
      await this.calculateUserIRPF(userId);
    },
    async calculateUserIRPF(userId) {
      this.selectedUserIrpf = 0;
      
      if (!userId || !this.form.date) {
        console.log('Missing userId or date:', { userId, date: this.form.date });
        return;
      }

      try {
        // Find the selected user in availableUsers
        const selectedUser = this.availableUsers.find(u => u.id === userId);
        console.log('Looking for user ID:', userId);
        console.log('Available users:', this.availableUsers.map(u => ({ id: u.id, username: u.username })));
        console.log('Selected user:', selectedUser);
        
        if (!selectedUser) {
          console.warn('User not found in availableUsers list');
          return;
        }
        
        // Get dedications for this user
        const dedications = await service({ requiresAuth: true }).get(
          `daily-dedications?_limit=-1&users_permissions_user.id=${userId}`
        );
        
        console.log('Dedications:', dedications.data);
        
        if (dedications.data && dedications.data.length > 0) {
          // Find dedication that matches the selected date
          const formattedDate = this.form.date.toISOString().split('T')[0]; // YYYY-MM-DD format
          console.log('Looking for dedication matching date:', formattedDate);
          
          const dedication = dedications.data.find(d => 
            d.from <= formattedDate && d.to >= formattedDate
          );
          
          console.log('Matching dedication:', dedication);
          
          if (dedication && dedication.pct_irpf) {
            this.selectedUserIrpf = dedication.pct_irpf;
            console.log('Set IRPF to:', this.selectedUserIrpf);
          } else {
            console.log('No matching dedication found or no IRPF percentage');
          }
        } else {
          console.log('No dedications found for user');
        }
      } catch (error) {
        console.error("Error calculating user IRPF:", error);
      }
    },
    cancel() {
      this.resetForm();
      this.$emit("cancel");
    },
    submit() {
      if (!this.isFormValid) {
        return;
      }

      const dietData = {
        user: this.form.user,
        project: this.form.project,
        concept: this.form.concept,
        kilometers: parseInt(this.form.kilometers),
        date: this.form.date,
        dietAmountWithoutIrpf: this.dietAmountWithoutIrpf,
        dietAmountWithIrpf: this.dietAmountWithIrpf,
        totalAmount: this.totalDietAmount
      };

      this.$emit("submit", dietData);
      this.resetForm();
    },
    resetForm() {
      this.form = {
        user: null,
        project: null,
        concept: "",
        kilometers: 0,
        date: new Date()
      };
      this.projectSearch = "";
      this.userSearch = "";
      this.selectedUserIrpf = 0;
    }
  }
};
</script>

<style scoped>
.modal-card-diet .modal-card-body {
  min-height: 400px;
  max-height: calc(100vh - 200px);
}

.modal-card-diet .field:not(:last-child) {
  margin-bottom: 1.5rem;
}
</style>