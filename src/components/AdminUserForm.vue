<template>
  <div v-if="!isLoading">
    <section class="section is-main-section">
      <!-- Basic Information -->
      <card-component title="INFORMACIÓ BÀSICA" icon="account">
        <form @submit.prevent="submit">
          <b-field label="Nom d'usuari *" horizontal>
            <b-input v-model="form.username" required />
          </b-field>

          <b-field label="Email *" horizontal>
            <b-input v-model="form.email" type="email" required />
          </b-field>

          <b-field label="Nom complet" horizontal>
            <b-input v-model="form.fullname" />
          </b-field>

          <b-field label="DNI/NIE" horizontal>
            <b-input v-model="form.identity_number" />
          </b-field>

          <b-field label="NAF" horizontal>
            <b-input v-model="form.naf" />
          </b-field>

          <b-field label="Decimal Excel" horizontal>
            <b-input v-model="form.excel_decimal" maxlength="1" />
          </b-field>
        </form>
      </card-component>

      <!-- Status -->
      <card-component title="ESTAT" icon="state-machine" class="mt-4">
        <form @submit.prevent="submit">
          <b-field label="Confirmat" horizontal>
            <b-switch v-model="form.confirmed" />
          </b-field>

          <b-field label="Bloquejat" horizontal>
            <b-switch v-model="form.blocked" />
          </b-field>

          <b-field label="Ocult" horizontal>
            <b-switch v-model="form.hidden" />
          </b-field>
        </form>
      </card-component>

      <!-- Role -->
      <card-component title="ROL I PERMISOS" icon="lock" class="mt-4">
        <form @submit.prevent="submit">
          <b-field label="Rol" horizontal>
            <b-select v-model="form.role" :loading="loadingRoles">
              <option :value="null">Selecciona un rol</option>
              <option
                v-for="role in roles"
                :key="role.id"
                :value="role.id"
              >
                {{ role.name }}
              </option>
            </b-select>
          </b-field>

          <b-field label="Permisos d'aplicació" horizontal>
            <div class="block">
              <b-field grouped group-multiline>
                <div class="control">
                  <b-checkbox
                    v-model="selectedPermissions"
                    native-value="projects"
                  >
                    Projectes
                  </b-checkbox>
                </div>
                <div class="control">
                  <b-checkbox
                    v-model="selectedPermissions"
                    native-value="orders"
                  >
                    Logística
                  </b-checkbox>
                </div>
                <div class="control">
                  <b-checkbox
                    v-model="selectedPermissions"
                    native-value="orders_admin"
                  >
                    Logística (Admin)
                  </b-checkbox>
                </div>
                <div class="control">
                  <b-checkbox
                    v-model="selectedPermissions"
                    native-value="orders_delivery"
                  >
                    Logística (Repartidores)
                  </b-checkbox>
                </div>
                <div class="control">
                  <b-checkbox
                    v-model="selectedPermissions"
                    native-value="hours"
                  >
                    Hores
                  </b-checkbox>
                </div>
                <div class="control">
                  <b-checkbox
                    v-model="selectedPermissions"
                    native-value="admin"
                  >
                    Admin
                  </b-checkbox>
                </div>
              </b-field>
            </div>
          </b-field>
        </form>
      </card-component>

      <!-- Logistics: only for orders_admin (issues/017) -->
      <card-component v-if="ordersAdmin" title="LOGÍSTICA" icon="truck" class="mt-4">
        <form @submit.prevent="submit">
          <b-field
            label="Descompte multientrega"
            message="Si es desmarca, les comandes d'aquest usuari no reben el descompte multientrega"
            horizontal
          >
            <b-switch v-model="form.multidelivery_discount" />
          </b-field>
        </form>
      </card-component>

      <!-- Password of an existing user (a new one is asked for it on save) -->
      <card-component v-if="userId" title="CONTRASENYA" icon="lock-reset" class="mt-4">
        <form @submit.prevent="submit">
          <b-field
            label="Nova contrasenya"
            message="Deixa-ho en blanc per no canviar-la. Mínim 6 caràcters"
            horizontal
          >
            <b-input
              v-model="password"
              type="password"
              minlength="6"
              autocomplete="new-password"
              password-reveal
            />
          </b-field>

          <b-field label="Repeteix la contrasenya" horizontal>
            <b-input
              v-model="passwordConfirmation"
              type="password"
              autocomplete="new-password"
              password-reveal
            />
          </b-field>
        </form>
      </card-component>

      <!-- Actions -->
      <card-component class="mt-4">
        <b-field horizontal>
          <b-button
            type="is-primary"
            :loading="submitting"
            @click="submit"
          >
            Guardar
          </b-button>
          <b-button
            type="is-light"
            @click="$router.push('/admin/users')"
          >
            Cancel·lar
          </b-button>
        </b-field>
      </card-component>
    </section>
  </div>
</template>

<script>
import service from '@/service/index';
import CardComponent from '@/components/CardComponent.vue';

export default {
  name: 'AdminUserForm',
  components: {
    CardComponent
  },
  props: {
    userId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      isLoading: false,
      submitting: false,
      loadingRoles: false,
      form: {
        username: '',
        email: '',
        fullname: '',
        identity_number: '',
        naf: '',
        excel_decimal: '',
        confirmed: false,
        blocked: false,
        hidden: false,
        role: null,
        // the backend only withholds the discount when this is exactly false
        multidelivery_discount: true
      },
      roles: [],
      selectedPermissions: [],
      ordersAdmin: false,
      password: '',
      passwordConfirmation: ''
    };
  },
  mounted() {
    this.loadRoles();
    this.loadMe();
    if (this.userId) {
      this.loadData();
    }
  },
  methods: {
    async loadRoles() {
      try {
        this.loadingRoles = true;
        const response = await service({ requiresAuth: true }).get('/users-permissions/roles');
        this.roles = response.data.roles || [];
        // new users get the Authenticated role unless another is picked (issues/027)
        if (!this.userId && !this.form.role) {
          this.form.role = this.findAuthenticatedRole();
        }
      } catch (error) {
        console.error('Error loading roles:', error);
      } finally {
        this.loadingRoles = false;
      }
    },
    async loadMe() {
      try {
        const me = await service({ requiresAuth: true, cached: true }).get('users/me');
        const permissions = (me.data.permissions || []).map(p => p.permission);
        this.ordersAdmin = permissions.includes('orders_admin');
      } catch (error) {
        console.error('Error loading permissions:', error);
      }
    },
    // The message to show when the new password can't be saved, or null
    passwordError() {
      if (!this.password) return null;
      if (this.password.length < 6) return 'La contrasenya ha de tenir 6 caràcters com a mínim';
      if (this.password !== this.passwordConfirmation) return 'Les contrasenyes no coincideixen';
      return null;
    },
    findAuthenticatedRole() {
      const role = this.roles.find(r => r.type === 'authenticated');
      return role ? role.id : null;
    },
    async authenticatedRoleId() {
      if (!this.roles.length) await this.loadRoles();
      return this.findAuthenticatedRole();
    },
    async loadData() {
      try {
        this.isLoading = true;
        const response = await service({ requiresAuth: true }).get(`/users/${this.userId}`);
        const user = response.data;
        
        // Populate form
        this.form.username = user.username || '';
        this.form.email = user.email || '';
        this.form.fullname = user.fullname || '';
        this.form.identity_number = user.identity_number || '';
        this.form.naf = user.naf || '';
        this.form.excel_decimal = user.excel_decimal || '';
        this.form.confirmed = user.confirmed || false;
        this.form.blocked = user.blocked || false;
        this.form.hidden = user.hidden || false;
        this.form.role = user.role && user.role.id ? user.role.id : null;
        this.form.multidelivery_discount = user.multidelivery_discount !== false;
        
        // Extract permissions
        if (user.permissions && user.permissions.length > 0) {
          this.selectedPermissions = user.permissions.map(p => p.permission);
        }
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error carregant dades: ${error.message}`,
          type: 'is-danger'
        });
      } finally {
        this.isLoading = false;
      }
    },
    async submit() {
      try {
        this.submitting = true;
        
        // Prepare data
        const data = {
          username: this.form.username,
          email: this.form.email,
          fullname: this.form.fullname,
          identity_number: this.form.identity_number,
          naf: this.form.naf,
          excel_decimal: this.form.excel_decimal,
          confirmed: this.form.confirmed,
          blocked: this.form.blocked,
          hidden: this.form.hidden,
          role: this.form.role,
          permissions: this.selectedPermissions.map(permission => ({ permission }))
        };
        // only orders_admin sees the switch, so nobody else overwrites it (issues/017)
        if (this.ordersAdmin) {
          data.multidelivery_discount = this.form.multidelivery_discount;
        }

        if (this.userId) {
          // Update
          const passwordError = this.passwordError();
          if (passwordError) {
            this.$buefy.toast.open({ message: passwordError, type: 'is-danger' });
            return;
          }
          if (this.password) data.password = this.password;
          await service({ requiresAuth: true }).put(`/users/${this.userId}`, data);
          this.$buefy.toast.open({
            message: 'Usuari actualitzat correctament',
            type: 'is-success'
          });
        } else {
          // Create - for new users, we need a password
          this.$buefy.dialog.prompt({
            message: 'Introdueix una contrasenya per al nou usuari',
            inputAttrs: {
              type: 'password',
              minlength: 6,
              required: true
            },
            trapFocus: true,
            onConfirm: async (password) => {
              try {
                data.password = password;
                // Strapi 5 requires a role (issues/027): saved before the roles loaded
                if (!data.role) data.role = await this.authenticatedRoleId();
                await service({ requiresAuth: true }).post('/users', data);
                this.$buefy.toast.open({
                  message: 'Usuari creat correctament',
                  type: 'is-success'
                });
                this.$router.push('/admin/users');
              } catch (error) {
                this.$buefy.toast.open({
                  message: `Error creant usuari: ${error.message}`,
                  type: 'is-danger'
                });
              }
            }
          });
          return; // Don't navigate yet, wait for password prompt
        }
        
        this.$router.push('/admin/users');
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error guardant usuari: ${error.message}`,
          type: 'is-danger'
        });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>
