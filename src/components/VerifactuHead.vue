<template>
  <!-- Redesign A: the head shared by Verifactu's configuration, its register and
       the FACe queue (one "Verifactu i FACe" entry in the menu) -->
  <div>
    <title-bar
      :title-stack="['Administració', 'Verifactu i FACe']"
      subtitle="Enviament de les factures emeses a l'Agència Tributària (Verifactu) i a les administracions públiques (FACe)."
    >
      <router-link to="/verifactu" class="button">Declaració responsable</router-link>
    </title-bar>
    <section class="section is-main-section vf-head">
      <div class="doc-kpis">
        <div class="doc-kpi">
          <span>Verifactu</span>
          <b>{{ modeName(verifactu.mode) }} <span class="tag" :class="modeTag(verifactu.mode)">{{ modeState(verifactu.mode) }}</span></b>
          <small>{{ verifactuText }}</small>
        </div>
        <div class="doc-kpi">
          <span>FACe</span>
          <b>{{ modeName(me.face) }} <span class="tag" :class="modeTag(me.face)">{{ modeState(me.face) }}</span></b>
          <small>Format de factura: {{ me.face_invoice_format === "ubl" ? "UBL" : me.face_invoice_format === "facturae" ? "FacturaE" : "—" }}</small>
        </div>
        <div class="doc-kpi">
          <span>Certificats</span>
          <b class="is-small">{{ certificatesTitle }}</b>
          <small>AEAT: {{ certificateText(certificates.verifactu) }} · FACe: {{ certificateText(certificates.face) }}</small>
        </div>
        <div class="doc-kpi">
          <span>Programari</span>
          <b class="is-small">{{ [verifactu.software_name, verifactu.software_version].filter(Boolean).join(" ") || "—" }}</b>
          <small v-if="verifactu.software_date">Declaració responsable del {{ verifactu.software_date }}</small>
        </div>
      </div>
      <nav class="tabs vf-tabs" aria-label="Verifactu i FACe">
        <ul>
          <li v-for="t in tabs" :key="t.id" :class="{ 'is-active': t.id === active }">
            <router-link :to="t.to" :aria-current="t.id === active ? 'page' : null">{{ t.label }}</router-link>
          </li>
        </ul>
      </nav>
    </section>
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import service from '@/service/index';

const DAY = 24 * 60 * 60 * 1000;
const expiresSoon = c => !!(c.certificate && c.certificate.notAfter) && new Date(c.certificate.notAfter) - Date.now() < 30 * DAY;

// One certificate's state for the head card: "vàlid fins 05/11/2026", "no n'hi ha"…
export function certificateText(status) {
  if (!status) return "—";
  if (!status.configured) return "no n'hi ha";
  if (!status.valid) return "amb errors";
  const until = status.certificate && status.certificate.notAfter;
  if (!until) return "configurat";
  const d = new Date(until);
  const date = [d.getDate(), d.getMonth() + 1].map(n => String(n).padStart(2, "0")).join("/") + "/" + d.getFullYear();
  return d <= new Date() ? `caducat el ${date}` : `vàlid fins ${date}`;
}

export default {
  name: 'VerifactuHead',
  components: { TitleBar },
  props: {
    // config | chain | face
    active: {
      type: String,
      default: 'config'
    }
  },
  data() {
    return {
      verifactu: {},
      me: {},
      // GET /certificates/:kind (issues/159); null while loading or refused
      certificates: { verifactu: null, face: null }
    };
  },
  computed: {
    tabs() {
      return [
        { id: 'config', label: 'Configuració', to: '/admin/verifactu' },
        { id: 'chain', label: 'Registre Verifactu', to: '/admin/verifactu-chain' },
        { id: 'face', label: 'Cua FACe', to: '/admin/face-queue' }
      ];
    },
    certificatesTitle() {
      const list = Object.values(this.certificates).filter(Boolean);
      if (!list.length) return "—";
      if (list.some(c => c.configured && !c.valid)) return "Amb errors";
      if (list.some(c => c.configured && expiresSoon(c))) return "Caduca aviat";
      return list.some(c => c.configured) ? "Configurats" : "Sense certificat";
    },
    verifactuText() {
      if (this.verifactu.mode === 'real') return "Les factures s'envien a l'AEAT";
      if (this.verifactu.mode === 'test') return "Les factures s'envien a l'entorn de proves";
      return "Les factures no s'envien a l'AEAT";
    }
  },
  async mounted() {
    try {
      const [verifactu, me] = await Promise.all([
        service({ requiresAuth: true }).get('/verifactu').catch(() => ({ data: {} })),
        service({ requiresAuth: true, cached: true }).get('/me').catch(() => ({ data: {} }))
      ]);
      this.verifactu = verifactu.data || {};
      this.me = me.data || {};
      const [aeat, face] = await Promise.all(['verifactu', 'face'].map(kind =>
        service({ requiresAuth: true }).get(`/certificates/${kind}`).then(r => r.data).catch(() => null)));
      this.certificates = { verifactu: aeat, face };
    } catch (e) {
      // the cards just stay empty
    }
  },
  methods: {
    certificateText,
    modeName(mode) {
      return mode === 'real' ? 'Real' : mode === 'test' ? 'Test' : 'No';
    },
    modeState(mode) {
      return mode === 'real' ? 'Actiu' : mode === 'test' ? 'Proves' : 'Desactivat';
    },
    modeTag(mode) {
      return mode === 'real' ? 'is-success is-light' : mode === 'test' ? 'is-warning is-light' : '';
    }
  }
};
</script>

<style scoped>
.vf-head {
  padding-bottom: 0 !important;
}
.doc-kpi b {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.doc-kpi b.is-small {
  font-size: 1.0625rem;
}
.doc-kpi .tag {
  font-size: .6875rem;
}
.vf-tabs {
  margin-bottom: 0;
}
</style>
