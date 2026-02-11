<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Unificar punts d'entrega</p>
      </header>
      <section class="modal-card-body" v-if="isModalActive">
        <b-message type="is-info">
          Aquesta acció mourà totes les comandes d'un punt d'entrega a un altre,
          permetent després eliminar el punt d'origen.
        </b-message>

        <b-field 
          label="Punt d'entrega origen (a eliminar) *"
          :type="{ 'is-danger': errors.sourceContact && submitted }"
          message="Escull el punt d'entrega que vols eliminar"
        >
          <b-autocomplete
            v-model="sourceContactSearch"
            placeholder="Punt d'entrega origen"
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredSourceContacts"
            field="display"
            @select="onSourceContactSelect"
            :clearable="true"
          >
          </b-autocomplete>
        </b-field>

        <b-field 
          label="Punt d'entrega destí (es quedarà) *"
          :type="{ 'is-danger': errors.targetContact && submitted }"
          message="Escull el punt d'entrega que rebrà totes les comandes"
        >
          <b-autocomplete
            v-model="targetContactSearch"
            placeholder="Punt d'entrega destí"
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredTargetContacts"
            field="display"
            @select="onTargetContactSelect"
            :clearable="true"
          >
          </b-autocomplete>
        </b-field>

        <b-message v-if="sourceContact && targetContact && sourceContact.id === targetContact.id" type="is-danger">
          El punt d'origen i el destí no poden ser el mateix!
        </b-message>

        <b-message v-if="sourceContact && sourceContact.num_orders > 0" type="is-warning">
          Aquest punt té {{ sourceContact.num_orders }} comand{{ sourceContact.num_orders > 1 ? 'es' : 'a' }} 
          que {{ sourceContact.num_orders > 1 ? 'seran mogudes' : 'serà moguda' }} al punt destí.
        </b-message>

      </section>
      <footer class="modal-card-foot">
        <b-button @click="cancel">Cancel·lar</b-button>
        <b-button 
          type="is-primary" 
          @click="confirm"
          :disabled="!canSubmit"
        >
          Unificar
        </b-button>
      </footer>
    </div>
  </b-modal>
</template>

<script>
import service from "@/service/index";

export default {
  name: 'ModalBoxUnifyContacts',
  props: {
    isActive: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      isModalActive: false,
      contacts: [],
      sourceContact: null,
      targetContact: null,
      sourceContactSearch: '',
      targetContactSearch: '',
      submitted: false,
      orders_admin: false
    }
  },
  computed: {
    filteredSourceContacts() {
      return this.contacts.filter(option => {
        return (
          option.display
            .toString()
            .toLowerCase()
            .indexOf(this.sourceContactSearch.toLowerCase()) >= 0
        );
      });
    },
    filteredTargetContacts() {
      return this.contacts.filter(option => {
        // Filter by search term
        const matchesSearch = option.display
          .toString()
          .toLowerCase()
          .indexOf(this.targetContactSearch.toLowerCase()) >= 0;
        
        // Exclude the source contact if selected
        const isNotSource = !this.sourceContact || option.id !== this.sourceContact.id;
        
        return matchesSearch && isNotSource;
      });
    },
    errors() {
      return {
        sourceContact: !this.sourceContact,
        targetContact: !this.targetContact
      };
    },
    canSubmit() {
      return this.sourceContact && 
             this.targetContact && 
             this.sourceContact.id !== this.targetContact.id;
    }
  },
  watch: {
    isActive (newValue) {
      this.isModalActive = newValue;
      if (newValue) {
        this.loadContacts();
      }
    },
    isModalActive (newValue) {
      if (!newValue) {
        this.cancel();
      }
    }
  },
  methods: {
    async loadContacts() {
      try {
        // Check user permissions
        const me = await service({ requiresAuth: true, cached: true }).get("users/me");
        const permissions = me.data.permissions.map(p => p.permission);
        this.orders_admin = (permissions.includes("orders_admin") || permissions.includes("orders_delivery"));
        
        // Load contacts with owner (user contacts / delivery points)
        const response = await service({ requiresAuth: true, cached: false }).get(
          `contacts/basic?_limit=-1&_where[owner_gt]=0&_sort=trade_name:ASC`
        );
        
        // Initialize contacts array with display field
        this.contacts = response.data.map(c => ({
          ...c,
          display: `${c.trade_name} (${c.id})`,
          num_orders: 0
        }));
        
        // Load contacts with orders count - use the correct endpoint based on permissions
        const ordersEndpoint = this.orders_admin ? 'contacts/orders' : 'contacts/withorders';
        const contactsWithOrders = await service({ requiresAuth: true }).get(
          `${ordersEndpoint}?_limit=-1&_sort=name:ASC`
        );
        
        // Update num_orders by reference (same approach as ContactsTable)
        for (const contact of contactsWithOrders.data) {
          const existingContact = this.contacts.find(c => c.id === contact.id);
          if (existingContact) {
            existingContact.num_orders = contact.num_orders;
          } else {
            // Add contact if not in basic list but has orders
            this.contacts.push({
              ...contact,
              display: `${contact.trade_name || contact.name} (${contact.id})`,
              num_orders: contact.num_orders || 0
            });
          }
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
        this.$buefy.snackbar.open({
          message: 'Error carregant punts d\'entrega',
          type: 'is-danger',
          queue: false
        });
      }
    },
    onSourceContactSelect(option) {
      if (option && option.id) {
        this.sourceContact = option;
        // If target is the same as source, clear target
        if (this.targetContact && this.targetContact.id === option.id) {
          this.targetContact = null;
          this.targetContactSearch = '';
        }
      } else {
        this.sourceContact = null;
      }
    },
    onTargetContactSelect(option) {
      if (option && option.id) {
        this.targetContact = option;
      } else {
        this.targetContact = null;
      }
    },
    cancel () {
      this.sourceContact = null;
      this.targetContact = null;
      this.sourceContactSearch = '';
      this.targetContactSearch = '';
      this.submitted = false;
      this.$emit('cancel');
    },
    async confirm () {
      this.submitted = true;
      
      if (!this.canSubmit) {
        return;
      }

      const numOrders = this.sourceContact.num_orders || 0;
      const ordersText = numOrders === 1 ? 'comanda' : 'comandes';
      
      this.$buefy.dialog.confirm({
        title: 'Unificar punts d\'entrega',
        message: `Estàs segur que vols moure <strong>${numOrders} ${ordersText}</strong> 
                  del punt <strong>${this.sourceContact.display}</strong> 
                  al punt <strong>${this.targetContact.display}</strong>?<br><br>
                  Després d'aquesta acció, podràs eliminar el punt d'origen.`,
        confirmText: 'Sí, unificar',
        cancelText: 'Cancel·lar',
        type: 'is-warning',
        hasIcon: true,
        onConfirm: async () => {
          try {
            // Call backend endpoint
            const response = await service({ requiresAuth: true }).post('contacts/unify', {
              sourceContactId: this.sourceContact.id,
              targetContactId: this.targetContact.id
            });
            
            this.$buefy.snackbar.open({
              message: `S'han mogut ${response.data.movedOrders} ${ordersText} correctament`,
              type: 'is-success',
              queue: false
            });
            
            this.$emit('confirm', {
              sourceContact: this.sourceContact,
              targetContact: this.targetContact,
              numOrders: response.data.movedOrders
            });
            
            this.cancel();
          } catch (error) {
            console.error('Error unifying contacts:', error);
            this.$buefy.snackbar.open({
              message: error.response?.data?.message || 'Error unificant punts d\'entrega',
              type: 'is-danger',
              queue: false
            });
          }
        }
      });
    }
  }
}
</script>

<style scoped>
.modal-card-foot {
  justify-content: flex-end;
}
</style>
