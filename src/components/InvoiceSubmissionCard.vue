<template>
  <!-- Side card of an emitted invoice: where it stands in Verifactu and FACe
       (mockup A-Factura-emesa). The backend adds verifactu_chain / face_queue to
       the invoice only when the integration is on ("missing" = not sent yet). -->
  <card-component class="tile is-child submission-card" title="Verifactu i FACe">
    <dl class="submission-list">
      <template v-for="row in rows" :key="row.name">
        <dt>{{ row.name }}</dt>
        <dd>
          <span class="tag" :class="row.status.tag">{{ row.status.label }}</span>
          <router-link v-if="row.link" :to="row.link" class="submission-link">Obre el registre</router-link>
        </dd>
      </template>
    </dl>
    <p class="submission-note">{{ note }}</p>
  </card-component>
</template>

<script>
import CardComponent from "@/components/CardComponent.vue";
import service from "@/service/index";

// verifactu-chain.state
const VERIFACTU = {
  missing: { label: "No enviada", tag: "" },
  pending: { label: "Pendent", tag: "is-warning" },
  ok: { label: "Correcta", tag: "is-success is-light" },
  okwitherrors: { label: "Acceptada amb errors", tag: "is-warning" },
  ko: { label: "Rebutjada", tag: "is-danger is-light" }
};
// face-queue.status
const FACE = {
  missing: { label: "No enviada", tag: "" },
  pending: { label: "Pendent", tag: "is-warning" },
  registered: { label: "Registrada", tag: "is-info is-light" },
  delivered: { label: "Lliurada", tag: "is-success is-light" },
  rejected: { label: "Rebutjada", tag: "is-danger is-light" },
  error: { label: "Error", tag: "is-danger is-light" }
};
const OFF = { label: "No activat", tag: "" };

export const submissionStatus = (kind, value) => {
  if (value === undefined || value === null || value === "") return OFF;
  const table = kind === "face" ? FACE : VERIFACTU;
  return table[value] || { label: String(value), tag: "" };
};

const isAdmin = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return (user.permissions || []).some(p => p.permission === "admin");
  } catch (e) {
    return false;
  }
};

export default {
  name: "InvoiceSubmissionCard",
  components: { CardComponent },
  props: {
    invoiceId: {
      type: [Number, String],
      required: true
    },
    verifactu: {
      type: String,
      default: undefined
    },
    face: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {
      chainId: null,
      queueId: null
    };
  },
  computed: {
    rows() {
      return [
        {
          name: "Verifactu",
          status: submissionStatus("verifactu", this.verifactu),
          link: this.chainId ? { name: "admin.verifactu-chain.edit", params: { id: this.chainId } } : null
        },
        {
          name: "FACe",
          status: submissionStatus("face", this.face),
          link: this.queueId ? { name: "admin.face-queue.edit", params: { id: this.queueId } } : null
        }
      ];
    },
    note() {
      if (!this.verifactu && !this.face) {
        return "Verifactu i FACe no estan activats per a l'entitat (Administració · Verifactu i FACe).";
      }
      return "Quan s'envien, aquí es veu l'estat de la cadena (correcta, pendent o amb errors) i l'enllaç al registre.";
    }
  },
  watch: {
    invoiceId: "loadLinks",
    verifactu: "loadLinks",
    face: "loadLinks"
  },
  mounted() {
    this.loadLinks();
  },
  methods: {
    // the register entries are admin screens: only look them up for admins
    async loadLinks() {
      this.chainId = null;
      this.queueId = null;
      if (!isAdmin()) return;
      const find = async (path, status) => {
        if (!status || status === "missing") return null;
        try {
          const res = await service({ requiresAuth: true }).get(`${path}?_where[emitted_invoice]=${this.invoiceId}&_limit=1`);
          const list = Array.isArray(res.data) ? res.data : (res.data && res.data.data) || [];
          return list.length ? list[0].id : null;
        } catch (e) {
          return null;
        }
      };
      const [chainId, queueId] = await Promise.all([
        find("verifactu-chains", this.verifactu),
        find("face-queues", this.face)
      ]);
      this.chainId = chainId;
      this.queueId = queueId;
    }
  }
};
</script>

<style scoped>
.submission-list {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: .625rem 1rem;
  align-items: center;
  margin: 0;
}
.submission-list dt {
  font-size: .875rem;
  color: var(--a-fg-2);
}
.submission-list dd {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  margin: 0;
}
.submission-link {
  font-size: .8125rem;
  font-weight: 700;
}
.submission-note {
  margin-top: .875rem;
  font-size: .8125rem;
  color: var(--a-muted);
}
</style>
