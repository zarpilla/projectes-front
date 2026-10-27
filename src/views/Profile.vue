<template>
  <div class="profile-page">
    <!-- Redesign A: the person's account. Users can't change their own data in the
         backend (only admins edit users, issues/020), so the data is shown here and
         the password goes through the reset link. -->
    <section class="section is-title-bar profile-head">
      <nav class="crumbs" aria-label="Ruta"><span>El meu compte</span></nav>
      <div class="profile-head-row">
        <span class="profile-avatar" aria-hidden="true">{{ initials }}</span>
        <div class="profile-head-text">
          <h1>{{ displayName }}</h1>
          <p class="has-text-muted">{{ me.email }} · les teves dades, la clau de pas i les novetats</p>
        </div>
        <b-button icon-left="logout" @click="doLogout">Sortir</b-button>
      </div>
    </section>

    <section class="section is-main-section">
      <div class="profile-columns">
        <div class="profile-main">
          <section class="form-box">
            <h2>Dades personals</h2>
            <div class="profile-grid">
              <div><span class="pf-label">Nom complet</span><span class="pf-value">{{ me.fullname || "—" }}</span><small>Surt als informes i a les llistes de persones.</small></div>
              <div><span class="pf-label">Nom d'usuari</span><span class="pf-value">{{ me.username || "—" }}</span></div>
              <div class="is-full"><span class="pf-label">Correu electrònic</span><span class="pf-value">{{ me.email || "—" }}</span><small>És el que fas servir per entrar.</small></div>
              <div class="is-full"><span class="pf-label">Calendari personal (iCal)</span><span class="pf-value">{{ me.ical || "Sense calendari" }}</span><small>Les cites d'aquest calendari es poden importar com a hores dedicades.</small></div>
            </div>
            <p class="profile-note">Per canviar aquestes dades, demana-ho a una persona administradora (Administració · Usuàries).</p>
          </section>

          <section class="form-box">
            <h2>Clau de pas</h2>
            <p class="form-box-sub">T'enviem un enllaç al correu per triar-ne una de nova.</p>
            <div class="profile-reset">
              <b-button type="is-primary" icon-left="email-outline" :loading="sending" :disabled="!me.email" @click="sendReset">Rep un enllaç per correu</b-button>
              <span v-if="sent" class="has-text-pos">Enviat a {{ me.email }}. Mira també la carpeta de correu brossa.</span>
              <span v-if="error" class="has-text-neg">No s'ha pogut enviar. Torna-ho a provar d'aquí a una estona.</span>
            </div>
          </section>

          <section class="form-box">
            <h2>Aparença</h2>
            <p class="form-box-sub">Es guarda en aquest navegador.</p>
            <div class="segmented" role="group" aria-label="Aparença">
              <button
                v-for="option in themeOptions"
                :key="option.id"
                type="button"
                :class="{ 'is-on': themeChoice === option.id }"
                :aria-pressed="themeChoice === option.id ? 'true' : 'false'"
                @click="chooseTheme(option.id)"
              >
                <b-icon :icon="option.icon" size="is-small" />
                <span>{{ option.label }}</span>
              </button>
            </div>
          </section>
        </div>

        <aside class="profile-side">
          <section class="form-box">
            <h2>Accés</h2>
            <dl class="profile-dl">
              <dt>Estat</dt>
              <dd><span class="tag" :class="me.blocked ? 'is-danger is-light' : 'is-success is-light'">{{ me.blocked ? "Bloquejat" : "Actiu" }}</span></dd>
              <dt>Permisos</dt>
              <dd>
                <span v-if="!permissions.length" class="has-text-muted">Cap</span>
                <span v-for="p in permissions" :key="p" class="tag">{{ permissionLabel(p) }}</span>
              </dd>
            </dl>
            <p class="profile-note">Els permisos els canvia una persona administradora.</p>
          </section>

          <section v-if="latest" class="form-box">
            <header class="side-head">
              <h2>Novetats</h2>
              <span class="has-text-muted">{{ changelogDate(latest.date) }}</span>
            </header>
            <ul class="news-list">
              <li v-for="(item, i) in latest.items.slice(0, 3)" :key="i">
                <span class="tag" :class="item.type === 'Novetats' ? 'is-success is-light' : 'is-warning is-light'">{{ item.type }}</span>
                <p>
                  <template v-if="typeof item.text === 'string'">{{ item.text }}</template>
                  <template v-else>
                    <template v-for="(part, k) in item.text" :key="k">
                      <router-link v-if="typeof part === 'object' && canOpenLink(part.to)" :to="part.to">{{ part.label }}</router-link>
                      <template v-else-if="typeof part === 'object'">{{ part.label }}</template>
                      <template v-else>{{ part }}</template>
                    </template>
                  </template>
                </p>
              </li>
            </ul>
            <router-link to="/novetats" class="news-all">Mira totes les novetats →</router-link>
          </section>
        </aside>
      </div>
    </section>
  </div>
</template>

<script>
import { canOpenPath, storedPermissions } from "@/domain/routeAccess";
import service from '@/service/index'
import { logout } from '@/service/auth'
import { CHANGELOG, changelogDate } from '@/service/changelog'
import { getThemeChoice, setThemeChoice } from '@/service/theme'
import { permissionLabel } from '@/domain/permissions'

export default {
  name: 'Profile',
  data () {
    return {
      me: {},
      sending: false,
      sent: false,
      error: false,
      themeChoice: getThemeChoice(),
      themeOptions: [
        { id: 'light', label: 'Clar', icon: 'white-balance-sunny' },
        { id: 'dark', label: 'Fosc', icon: 'weather-night' },
        { id: 'system', label: 'Com el sistema', icon: 'monitor' }
      ]
    }
  },
  computed: {
    displayName () {
      return this.me.fullname || this.me.username || ''
    },
    initials () {
      const words = String(this.displayName || '?').split(/[\s._@-]+/).filter(Boolean)
      return words.slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'
    },
    permissions () {
      return (this.me.permissions || []).map(p => p.permission).filter(Boolean)
    },
    latest () {
      return CHANGELOG[0] || null
    }
  },
  async mounted () {
    try {
      this.me = (await service({ requiresAuth: true }).get('users/me')).data || {}
    } catch (e) {
      this.me = {}
    }
  },
  methods: {
    // a page the user can't open is named, not linked (issues/121)
    canOpenLink(to) {
      return canOpenPath(to, storedPermissions());
    },
    chooseTheme (choice) {
      this.themeChoice = choice
      setThemeChoice(choice)
    },
    permissionLabel,
    changelogDate,
    async sendReset () {
      this.sending = true
      this.sent = false
      this.error = false
      try {
        await service().post('auth/forgot-password', { email: this.me.email })
        this.sent = true
      } catch (e) {
        this.error = true
      } finally {
        this.sending = false
      }
    },
    async doLogout () {
      await logout()
      location.href = import.meta.env.BASE_URL
    }
  }
}
</script>

<style scoped>
.profile-head {
  padding: 1.5rem 2rem .25rem;
}
.crumbs {
  font-size: .875rem;
  color: var(--a-muted);
  margin-bottom: .5rem;
}
.profile-head-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.profile-head-text {
  flex: 1;
  min-width: 0;
}
.profile-head h1 {
  font-size: 1.75rem;
  font-weight: 800;
}
.profile-avatar {
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
.profile-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 26rem;
  gap: 1rem;
  align-items: start;
}
.profile-main,
.profile-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-box {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
}
.form-box h2 {
  font-size: 1.125rem;
  font-weight: 800;
  margin-bottom: .75rem;
}
.form-box-sub {
  color: var(--a-fg-2);
  font-size: .875rem;
  margin: -.5rem 0 1rem;
}
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.5rem;
}
.profile-grid .is-full {
  grid-column: 1 / -1;
}
.pf-label {
  display: block;
  font-size: .8125rem;
  font-weight: 700;
  color: var(--a-muted);
}
.pf-value {
  display: block;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.profile-grid small,
.profile-note {
  display: block;
  font-size: .8125rem;
  color: var(--a-fg-2);
}
.profile-note {
  margin-top: 1rem;
}
.profile-reset {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .75rem;
  font-size: .875rem;
}
.profile-page .segmented button {
  display: inline-flex;
  align-items: center;
  gap: .375rem;
}
.profile-dl {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  gap: .5rem 1rem;
  font-size: .875rem;
}
.profile-dl dt {
  color: var(--a-muted);
}
.profile-dl .tag {
  margin: 0 .25rem .25rem 0;
}
.side-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.news-list li + li {
  margin-top: .75rem;
}
.news-list p {
  margin-top: .375rem;
  font-size: .875rem;
}
.news-all {
  display: inline-block;
  margin-top: .75rem;
  font-weight: 700;
  text-decoration: underline;
}
@media screen and (max-width: 1215px) {
  .profile-columns {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media screen and (max-width: 768px) {
  .profile-head {
    padding: 1rem 1rem .25rem;
  }
  .profile-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
