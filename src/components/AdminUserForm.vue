<template>
  <div v-if="!isLoading" class="user-form">
    <!-- Redesign A: head with the user, data / permissions / access / password on
         the left, the work periods on the right, and a save bar -->
    <section class="title-bar user-head">
      <nav class="crumbs" aria-label="Ruta">
        <span>Administració</span><span aria-hidden="true">/</span>
        <router-link to="/administracio/usuaries">Usuàries</router-link>
      </nav>
      <div class="user-head-row">
        <span class="user-avatar" aria-hidden="true">{{ initials }}</span>
        <div class="user-head-text">
          <h1>
            {{ userId ? (form.fullname || form.username || "Usuària") : "Nova usuària" }}
            <span v-if="userId" class="tag" :class="stateTag.css">{{ stateTag.label }}</span>
            <span v-if="userId && form.hidden" class="tag">Ocult</span>
          </h1>
          <p v-if="userId" class="has-text-muted">{{ summaryLine }}</p>
        </div>
        <router-link v-if="userId" to="/jornada" class="button">Fitxa a Persones</router-link>
      </div>
    </section>

    <section class="section is-main-section">
      <div class="user-columns">
        <div class="user-main">
          <section class="form-box">
            <h2>Dades</h2>
            <p class="form-box-sub">Els camps amb * són obligatoris.</p>
            <form class="user-grid" @submit.prevent="submit">
              <b-field label="Nom d'usuari *">
                <b-input v-model="form.username" required />
              </b-field>
              <b-field label="Correu electrònic *" message="Amb aquest correu entra a l'aplicació.">
                <b-input v-model="form.email" type="email" required />
              </b-field>
              <b-field label="Nom complet" message="Surt als informes, al registre de jornades i a les nòmines." class="is-full">
                <b-input v-model="form.fullname" />
              </b-field>
              <b-field label="Nom a mostrar" message="Amb aquest nom la saluda l'Inici. Si és buit: el nom complet per a les sòcies, el primer nom per a la resta." class="is-full">
                <b-input v-model="form.display_name" placeholder="Per exemple: Marina, La Dotzena" />
              </b-field>
              <b-field label="DNI/NIE">
                <b-input v-model="form.identity_number" placeholder="Per al registre de jornades" />
              </b-field>
              <b-field label="NAF">
                <b-input v-model="form.naf" placeholder="Número d'afiliació a la Seguretat Social" />
              </b-field>
              <b-field label="Calendari personal (iCal)" message="Les cites d'aquest calendari es poden importar com a hores dedicades." class="is-full">
                <b-input v-model="form.ical" placeholder="https://…/calendari.ics" />
              </b-field>
            </form>
          </section>

          <section class="form-box">
            <h2>Permisos</h2>
            <p class="form-box-sub">Què pot veure i fer a l'aplicació. Es poden combinar.</p>
            <div class="perm-groups">
              <fieldset v-for="group in permissionGroups" :key="group.title" class="perm-group">
                <legend>{{ group.title }}</legend>
                <label v-for="p in group.items" :key="p.value" class="perm-option">
                  <b-checkbox v-model="selectedPermissions" :native-value="p.value">
                    <b>{{ p.label }}</b>
                    <small>{{ p.help }}</small>
                  </b-checkbox>
                </label>
              </fieldset>
            </div>
            <b-field label="Rol" message="Rol tècnic de l'API. Gairebé sempre Authenticated." class="role-field">
              <b-select v-model="form.role" :loading="loadingRoles">
                <option :value="null">Selecciona un rol</option>
                <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
              </b-select>
            </b-field>
          </section>

          <!-- Logistics: only for orders_admin (issues/017) -->
          <section v-if="ordersAdmin" class="form-box">
            <h2>Logística</h2>
            <b-field message="Si es desmarca, les comandes d'aquesta usuària no reben el descompte multientrega">
              <b-checkbox v-model="form.multidelivery_discount">Descompte multientrega</b-checkbox>
            </b-field>
          </section>

          <section class="form-box">
            <h2>Accés</h2>
            <div class="access-list">
              <label v-for="a in accessOptions" :key="a.key" class="access-option">
                <b-checkbox v-model="form[a.key]">
                  <b>{{ a.label }}</b>
                  <small>{{ a.help }}</small>
                </b-checkbox>
              </label>
            </div>
          </section>

          <!-- Password of an existing user (a new one is asked for it on save).
               Setting someone else's password is discouraged: the link lets her
               choose it, and nobody else knows it. Some tenants asked to keep it. -->
          <section v-if="userId" class="form-box">
            <h2>Clau de pas</h2>
            <div class="password-advice">
              <p>
                <b>Recomanat:</b> envia-li un enllaç per correu perquè triï la clau ella mateixa.
                Així ningú més la coneix.
              </p>
              <b-button size="is-small" icon-left="email-outline" :loading="sendingLink" :disabled="!form.email" @click="sendLink">
                Envia-li l'enllaç per canviar la clau
              </b-button>
              <span v-if="linkSent" class="has-text-success link-sent">Enviat a {{ form.email }}</span>
            </div>
            <p class="form-box-sub">
              També la pots posar tu, però no és recomanable: hauràs de fer-l'hi arribar per un canal segur
              i demanar-li que la canviï. Deixa-ho en blanc per no canviar-la. {{ passwordHint }}
            </p>
            <div class="user-grid">
              <!-- our own messages: the browser's (minlength) come in its language -->
              <b-field label="Clau nova" :type="tooShort ? 'is-danger' : ''" :message="tooShort ? `${[...password].length} de ${minLength} caràcters com a mínim` : ''">
                <b-input v-model="password" type="password" autocomplete="new-password" password-reveal :use-html5-validation="false" />
              </b-field>
              <b-field
                label="Repeteix la clau"
                :type="mismatch ? 'is-danger' : ''"
                :message="mismatch ? 'Les dues claus no coincideixen' : ''"
              >
                <b-input v-model="passwordConfirmation" type="password" autocomplete="new-password" password-reveal :use-html5-validation="false" />
              </b-field>
            </div>
          </section>
        </div>

        <aside v-if="userId" class="user-side">
          <section class="form-box periods-box">
            <header class="periods-head">
              <h2>Jornada i cost/hora</h2>
              <router-link to="/jornada">Edita a Persones</router-link>
            </header>
            <table v-if="periods.length" class="table is-fullwidth periods-table">
              <thead>
                <tr>
                  <th>Període</th>
                  <th class="has-text-right">h/dia</th>
                  <th class="has-text-right">€/h</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in periods.slice(0, 8)" :key="p.id" :class="{ 'is-now': isCurrent(p) }">
                  <td>{{ shortDate(p.from) }} – {{ shortDate(p.to) }} <span v-if="isCurrent(p)" class="now-mark">Ara</span></td>
                  <td class="has-text-right">{{ number(p.hours) }}</td>
                  <td class="has-text-right">{{ p.costByHour ? number(p.costByHour) : "—" }}</td>
                </tr>
              </tbody>
            </table>
            <p class="periods-note">
              <template v-if="periods.length">{{ periods.length }} períodes. El cost/hora valora les hores dedicades als projectes.</template>
              <template v-else>Encara no té cap període de jornada.</template>
            </p>
          </section>
        </aside>
      </div>
    </section>

    <div class="savebar">
      <span class="savebar-state">{{ userId ? "Desa els canvis quan acabis" : "Es demanarà la clau en desar" }}</span>
      <b-button @click="$router.push('/administracio/usuaries')">Cancel·la</b-button>
      <b-button type="is-primary" :loading="submitting" @click="submit">Guardar</b-button>
    </div>
  </div>
</template>

<script>
import service from '@/service/index';
import CardComponent from '@/components/CardComponent.vue';
import moment from 'moment';
import { formatNumber } from '@/helpers/format-number';
import { permissionCodes } from '@/domain/permissions';
import { MIN_LENGTH, passwordProblem, apiMessage, randomPassword, sendPasswordLink } from '@/service/passwordPolicy';

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Strapi's users-permissions role types, in Catalan (issues/113)
const ROLE_LABELS = { authenticated: 'usuària', public: 'públic' };

const PERMISSION_GROUPS = [
  {
    title: 'Projectes i temps',
    items: [
      { value: 'projects', label: 'Projectes', help: 'Projectes, contactes, ingressos i despeses, tresoreria i informes.' },
      { value: 'hours', label: 'Hores', help: 'Hores dedicades i registre de jornades propis.' }
    ]
  },
  {
    title: 'Logística',
    items: [
      { value: 'orders', label: 'Logística', help: "Comandes, dipòsits, factures i punts d'entrega." },
      { value: 'orders_admin', label: 'Logística (Admin)', help: 'Gestiona totes les comandes, rutes, incidències i el descompte multientrega.' },
      { value: 'orders_delivery', label: 'Logística (Repartidores)', help: 'Veu les entregues que ha de fer.' }
    ]
  },
  {
    title: 'Comunitat energètica',
    items: [
      { value: 'admin_energy', label: 'Comunitat energètica', help: 'Sòcies, CUPS, documentació, instal·lacions i coeficients de repartiment.' }
    ]
  },
  {
    title: 'Administració',
    items: [
      { value: 'admin', label: 'Admin', help: 'Aquest apartat: configuració, usuàries, Verifactu i FACe, taules auxiliars.' }
    ]
  }
];

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
        display_name: '',
        identity_number: '',
        naf: '',
        ical: '',
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
      passwordConfirmation: '',
      passwordHint: `Mínim ${MIN_LENGTH} caràcters; no pot ser una clau comuna ni contenir el seu nom o correu.`,
      minLength: MIN_LENGTH,
      sendingLink: false,
      linkSent: false,
      periods: []
    };
  },
  computed: {
    tooShort() {
      return !!this.password && [...this.password].length < MIN_LENGTH;
    },
    mismatch() {
      return !!this.passwordConfirmation && this.password !== this.passwordConfirmation;
    },
    permissionGroups() {
      return PERMISSION_GROUPS;
    },
    accessOptions() {
      return [
        { key: 'confirmed', label: 'Confirmat', help: 'Ha confirmat el seu correu electrònic.' },
        { key: 'blocked', label: 'Bloquejat', help: "No pot entrar a l'aplicació. Les seves dades es conserven." },
        { key: 'hidden', label: 'Ocult', help: 'No surt a les llistes de persones (informes, jornades, dedicació). Per a qui ja no treballa a l\'entitat.' }
      ];
    },
    initials() {
      const words = String(this.form.fullname || this.form.username || '?').split(/[\s._@-]+/).filter(Boolean);
      return words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
    },
    stateTag() {
      if (this.form.blocked) return { label: 'Bloquejat', css: 'is-danger is-light' };
      if (!this.form.confirmed) return { label: 'Sense confirmar', css: 'is-warning is-light' };
      return { label: 'Actiu', css: 'is-success is-light' };
    },
    summaryLine() {
      const role = this.roles.find(r => r.id === this.form.role);
      const labels = PERMISSION_GROUPS.flatMap(g => g.items).filter(p => this.selectedPermissions.includes(p.value)).map(p => p.label);
      const parts = [this.form.email];
      if (role) parts.push(`rol ${ROLE_LABELS[role.type] || role.name}`);
      parts.push(labels.length ? `permisos ${labels.join(', ')}` : 'cap permís');
      return parts.filter(Boolean).join(' · ');
    }
  },
  mounted() {
    this.loadRoles();
    this.loadMe();
    if (this.userId) {
      this.loadData();
      this.loadPeriods();
    }
  },
  methods: {
    async loadPeriods() {
      try {
        const response = await service({ requiresAuth: true }).get(`daily-dedications?_limit=-1&_where[users_permissions_user.id]=${this.userId}`);
        this.periods = [...response.data].sort((a, b) => (a.from < b.from ? 1 : -1));
      } catch (error) {
        this.periods = [];
      }
    },
    isCurrent(p) {
      const today = moment().format('YYYY-MM-DD');
      return p.from <= today && (!p.to || p.to >= today);
    },
    shortDate(value) {
      return value ? moment(value).format('DD/MM/YYYY') : '…';
    },
    number(value) {
      return formatNumber(Number(value) || 0, 2, 2);
    },
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
      return passwordProblem(this.password, this.passwordConfirmation);
    },
    // the reset e-mail, the same one «He oblidat la clau» sends
    async sendLink() {
      this.sendingLink = true;
      this.linkSent = false;
      try {
        await sendPasswordLink(this.form.email);
        this.linkSent = true;
      } catch (error) {
        this.$buefy.toast.open({ message: apiMessage(error, "No s'ha pogut enviar l'enllaç"), type: 'is-danger' });
      } finally {
        this.sendingLink = false;
      }
    },
    // a new user: created with the given password, or with a random one nobody
    // knows and the link to choose hers
    async createUser(data, password) {
      const byLink = !password;
      try {
        data.password = byLink ? randomPassword() : password;
        // Strapi 5 requires a role (issues/027): saved before the roles loaded
        if (!data.role) data.role = await this.authenticatedRoleId();
        await service({ requiresAuth: true }).post('/users', data);
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error creant la usuària: ${apiMessage(error, error.message)}`,
          type: 'is-danger'
        });
        return false;
      }
      let message = 'Usuària creada correctament';
      if (byLink) {
        try {
          await sendPasswordLink(data.email);
          message += `. Li hem enviat l'enllaç per triar la clau a ${data.email}`;
        } catch (error) {
          message += ", però no s'ha pogut enviar l'enllaç: envia-l'hi des de la seva fitxa";
        }
      }
      this.$buefy.toast.open({ message, type: 'is-success', duration: 6000 });
      this.$router.push('/administracio/usuaries');
      return true;
    },
    askPassword(data) {
      this.$buefy.dialog.prompt({
        title: 'Clau de la nova usuària',
        message: `${this.passwordHint} Fes-l'hi arribar per un canal segur i demana-li que la canviï.`,
        // no minlength/required: the browser would say it in its own language
        inputAttrs: { type: 'password', autocomplete: 'new-password' },
        trapFocus: true,
        closeOnConfirm: false,
        onConfirm: async (password, dialog) => {
          const problem = passwordProblem(password);
          if (problem) {
            // shown under the input, the dialog stays open
            dialog.validationMessage = problem;
            return;
          }
          dialog.close();
          await this.createUser(data, password);
        }
      });
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
        this.form.display_name = user.display_name || '';
        this.form.identity_number = user.identity_number || '';
        this.form.naf = user.naf || '';
        this.form.ical = user.ical || '';
        this.form.confirmed = user.confirmed || false;
        this.form.blocked = user.blocked || false;
        this.form.hidden = user.hidden || false;
        this.form.role = user.role && user.role.id ? user.role.id : null;
        this.form.multidelivery_discount = user.multidelivery_discount !== false;
        
        // Extract permissions
        if (user.permissions && user.permissions.length > 0) {
          this.selectedPermissions = permissionCodes(user.permissions);
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
          display_name: (this.form.display_name || '').trim() || null,
          identity_number: this.form.identity_number,
          naf: this.form.naf,
          ical: this.form.ical || null,
          confirmed: this.form.confirmed,
          blocked: this.form.blocked,
          hidden: this.form.hidden,
          role: this.form.role,
          permissions: permissionCodes(this.selectedPermissions).map(permission => ({ permission }))
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
          try {
            await service({ requiresAuth: true }).put(`/users/${this.userId}`, data);
          } catch (error) {
            this.$buefy.toast.open({
              message: `Error guardant la usuària: ${apiMessage(error, error.message)}`,
              type: 'is-danger'
            });
            return;
          }
          this.$buefy.toast.open({
            message: 'Usuària actualitzada correctament',
            type: 'is-success'
          });
        } else {
          // Create: Strapi needs a password. Recommended: a random one and the
          // link for her to choose hers; some tenants want to set it themselves.
          if (!data.email) {
            this.$buefy.toast.open({ message: 'Cal el correu electrònic de la nova usuària', type: 'is-danger' });
            return;
          }
          this.$buefy.dialog.confirm({
            title: 'Com tindrà la clau?',
            message:
              `Recomanat: li enviem un correu a <b>${escapeHtml(data.email)}</b> amb un enllaç perquè triï la clau ella mateixa. ` +
              'També la pots posar tu, però no és recomanable: l\'hauràs de fer arribar per un canal segur.',
            confirmText: "Envia-li l'enllaç",
            cancelText: 'La poso jo',
            canCancel: ['button'],
            trapFocus: true,
            onConfirm: () => this.createUser(data, null),
            onCancel: () => this.askPassword(data)
          });
          return; // Don't navigate yet, wait for password prompt
        }
        
        this.$router.push('/administracio/usuaries');
      } catch (error) {
        this.$buefy.toast.open({
          message: `Error guardant la usuària: ${error.message}`,
          type: 'is-danger'
        });
      } finally {
        this.submitting = false;
      }
    }
  }
};
</script>
<style scoped>
.password-advice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem .75rem;
  padding: .75rem 1rem;
  margin-bottom: .75rem;
  border-radius: 8px;
  background: var(--a-info-bg);
  color: var(--a-info-fg);
  border: 1px solid var(--a-info-line);
}
.password-advice p {
  flex: 1 1 100%;
  margin: 0;
}
.link-sent {
  font-size: .875rem;
}
.user-head {
  padding: 1.5rem 2rem .25rem;
}
@media screen and (max-width: 768px) {
  .user-head {
    padding: 1rem 1rem .25rem;
  }
}
.crumbs {
  display: flex;
  gap: .375rem;
  font-size: .875rem;
  color: var(--a-muted);
  margin-bottom: .5rem;
}
.user-head-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.user-head-text {
  flex: 1;
  min-width: 0;
}
@media screen and (max-width: 768px) {
  /* the avatar and the name on a row, the button below */
  .user-head-row {
    flex-wrap: wrap;
  }
  .user-head-text {
    flex-basis: calc(100% - 4.5rem);
  }
}
.user-head h1 {
  font-size: 1.75rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .5rem;
}
.user-avatar {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--a-accent-soft);
  color: var(--a-accent);
  font-weight: 800;
  font-size: 1.125rem;
}
.user-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 27rem;
  gap: 1rem;
  align-items: start;
  padding-bottom: 5rem;
}
.form-box {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
}
.form-box h2 {
  font-size: 1.125rem;
  font-weight: 800;
}
.form-box-sub {
  color: var(--a-fg-2);
  font-size: .875rem;
  margin-bottom: 1rem;
}
.user-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .25rem 1.25rem;
}
.user-grid .is-full {
  grid-column: 1 / -1;
}
.perm-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}
.perm-group {
  border: 1px solid var(--a-line);
  border-radius: 10px;
  padding: .75rem 1rem;
}
.perm-group legend {
  font-size: .6875rem;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--a-muted);
  padding: 0 .25rem;
}
.perm-option,
.access-option {
  display: block;
  padding: .375rem 0;
}
.perm-option small,
.access-option small {
  display: block;
  font-size: .8125rem;
  color: var(--a-fg-2);
  line-height: 1.4;
}
.access-option + .access-option {
  border-top: 1px solid var(--a-line-soft);
}
.role-field {
  max-width: 20rem;
}
.periods-box {
  padding: 0;
  overflow: hidden;
}
.periods-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--a-line);
}
.periods-head h2 {
  font-size: 1rem;
}
.periods-head a {
  font-size: .875rem;
  font-weight: 700;
  text-decoration: underline;
}
.periods-table {
  font-size: .875rem;
  font-variant-numeric: tabular-nums;
}
.periods-table th:first-child,
.periods-table td:first-child {
  padding-left: 1.25rem;
}
.periods-table th:last-child,
.periods-table td:last-child {
  padding-right: 1.25rem;
}
.periods-table tr.is-now > * {
  background: var(--a-accent-soft);
}
.now-mark {
  margin-left: .375rem;
  font-size: .75rem;
  font-weight: 800;
  color: var(--a-accent);
}
.periods-note {
  padding: .75rem 1.25rem 1rem;
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.savebar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: .75rem;
  padding: .5rem 2rem;
  background: var(--a-surface);
  border-top: 1px solid var(--a-line);
  box-shadow: 0 -6px 16px rgba(16, 32, 30, .06);
}
.savebar-state {
  margin-right: auto;
  font-weight: 700;
  color: var(--a-muted);
}
@media screen and (max-width: 1215px) {
  .user-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media screen and (max-width: 768px) {
  .user-grid,
  .perm-groups {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
