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
          <b class="is-small">A l'àrea del servidor</b>
          <small>El certificat i la contrasenya es posen a l'àrea d'administració del servidor</small>
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
      me: {}
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
    } catch (e) {
      // the cards just stay empty
    }
  },
  methods: {
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
