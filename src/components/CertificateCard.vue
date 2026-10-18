<template>
  <!-- The AEAT (Verifactu) or FACe certificate (ticket 159): what the backend
       reads from it with the stored password, and the form to upload or replace
       it. The password is never shown nor prefilled; it only goes in the upload.
       kind="google": the Google service-account key (.json, no password). -->
  <div class="cert-card">
    <div class="cert-head">
      <h3>{{ title }}</h3>
      <span class="tag" :class="summary.tag">{{ summary.label }}</span>
    </div>

    <p v-if="loadError" class="cert-empty">No s'ha pogut consultar el certificat: {{ loadError }}</p>
    <template v-else-if="status">
      <p v-if="!status.configured" class="cert-empty">{{ text.none }}</p>
      <dl v-else class="cert-facts">
        <template v-if="status.account">
          <dt>Compte</dt><dd>{{ status.account.clientEmail }}</dd>
          <dt>Projecte</dt><dd>{{ status.account.projectId || "—" }}</dd>
        </template>
        <template v-if="status.certificate">
          <dt>Titular</dt><dd>{{ holder }}</dd>
          <dt>NIF</dt><dd>{{ status.certificate.nif || "—" }}</dd>
          <dt>Emès per</dt><dd>{{ issuer }}</dd>
          <dt>Vàlid fins</dt><dd :class="{ 'has-text-neg': expiry.expired }">{{ formatDate(status.certificate.notAfter) }}</dd>
        </template>
        <dt>Fitxer</dt><dd>{{ status.fileName }}<template v-if="status.uploadedAt"> · pujat el {{ formatDate(status.uploadedAt) }}</template></dd>
      </dl>

      <div v-if="status.configured && status.message" class="notification is-danger is-light">{{ status.message }}</div>
      <div v-if="expiry.expired" class="notification is-danger is-light">
        El certificat va caducar el {{ formatDate(status.certificate.notAfter) }}. Puja'n un de vigent.
      </div>
      <div v-else-if="expiry.soon" class="notification is-warning">
        El certificat caduca {{ expiry.days === 0 ? "avui" : `d'aquí a ${expiry.days} ${expiry.days === 1 ? "dia" : "dies"}` }}. Renova'l i puja el nou.
      </div>
    </template>

    <!-- not a <form>: it sits inside the settings form, and Enter here must not save that one -->
    <div v-if="editing" class="cert-upload">
      <b-field :label="text.fileLabel">
        <input ref="file" class="input" type="file" :accept="text.accept" @change="onFile" />
      </b-field>
      <b-field v-if="!isKey" label="Contrasenya del certificat">
        <b-input v-model="password" type="password" password-reveal autocomplete="new-password" @keydown.enter.prevent="upload" />
      </b-field>
      <div class="cert-actions">
        <b-button type="is-primary" class="cert-save" :loading="saving" :disabled="!file" @click="upload">{{ text.save }}</b-button>
        <b-button class="cert-cancel" @click="cancel">Cancel·la</b-button>
      </div>
    </div>
    <div v-else-if="status" class="cert-actions">
      <b-button class="cert-edit" @click="editing = true">{{ status.configured ? text.replace : text.upload }}</b-button>
      <b-button v-if="status.configured" type="is-danger" outlined class="cert-remove" :loading="saving" @click="confirmRemove">{{ text.remove }}</b-button>
    </div>
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";

const SOON_DAYS = 30;

const TEXTS = {
  certificate: {
    none: "Encara no s'ha pujat cap certificat.",
    fileLabel: "Fitxer del certificat (.p12 o .pfx)",
    accept: ".p12,.pfx",
    save: "Desa el certificat",
    upload: "Puja el certificat",
    replace: "Substitueix el certificat",
    remove: "Treu el certificat",
    saved: "Certificat desat",
    removed: "Certificat tret",
    notSaved: "No s'ha desat el certificat",
    removeTitle: "Treure el certificat",
    removeMessage: "S'esborrarà el certificat i la seva contrasenya. Fins que no en pugis un altre no es podran enviar factures amb aquest servei."
  },
  // the Google service-account key (issues/159)
  key: {
    none: "Encara no s'ha pujat cap clau.",
    fileLabel: "Clau del compte de servei de Google (.json)",
    accept: ".json,application/json",
    save: "Desa la clau",
    upload: "Puja la clau",
    replace: "Substitueix la clau",
    remove: "Treu la clau",
    saved: "Clau desada",
    removed: "Clau treta",
    notSaved: "No s'ha desat la clau",
    removeTitle: "Treure la clau",
    removeMessage: "S'esborrarà la clau. Fins que no en pugis una altra no s'importaran els calendaris de Google."
  }
};

/** Days left until `notAfter` (negative once expired) and whether to warn. */
export function certificateExpiry(certificate, now = new Date()) {
  if (!certificate || !certificate.notAfter) return { expired: false, soon: false, days: null };
  const days = moment(certificate.notAfter).diff(moment(now), "days");
  const expired = new Date(certificate.notAfter) <= now;
  return { expired, soon: !expired && days < SOON_DAYS, days };
}

export default {
  name: "CertificateCard",
  props: {
    // 'verifactu' (AEAT) | 'face' | 'google' (service-account key)
    kind: { type: String, required: true },
    title: { type: String, default: "Certificat" }
  },
  data() {
    return {
      status: null,
      loadError: null,
      editing: false,
      file: null,
      password: "",
      saving: false
    };
  },
  computed: {
    isKey() {
      return this.kind === "google";
    },
    text() {
      return this.isKey ? TEXTS.key : TEXTS.certificate;
    },
    expiry() {
      return certificateExpiry(this.status && this.status.certificate);
    },
    summary() {
      const s = this.status;
      if (!s) return { label: "…", tag: "" };
      if (!s.configured) return { label: "No configurat", tag: "is-warning" };
      if (!s.valid || this.expiry.expired) return { label: "Amb errors", tag: "is-danger is-light" };
      if (this.expiry.soon) return { label: "Caduca aviat", tag: "is-warning" };
      return { label: "Configurat", tag: "is-success is-light" };
    },
    holder() {
      const { commonName, organization } = this.status.certificate.subject || {};
      return [commonName, organization && organization !== commonName ? organization : null].filter(Boolean).join(" · ") || "—";
    },
    issuer() {
      const { commonName, organization } = this.status.certificate.issuer || {};
      return commonName || organization || "—";
    }
  },
  async mounted() {
    await this.load();
  },
  methods: {
    formatDate(value) {
      return value ? moment(value).format("DD/MM/YYYY") : "";
    },
    errorMessage(error) {
      return (error.response && error.response.data && error.response.data.message) || error.message;
    },
    async load() {
      try {
        this.status = (await service({ requiresAuth: true }).get(`/certificates/${this.kind}`)).data;
        this.loadError = null;
      } catch (error) {
        this.loadError = this.errorMessage(error);
      }
    },
    onFile(event) {
      this.file = (event.target.files && event.target.files[0]) || null;
    },
    cancel() {
      this.editing = false;
      this.file = null;
      this.password = "";
    },
    async upload() {
      if (!this.file || this.saving) return;
      this.saving = true;
      try {
        const formData = new FormData();
        formData.append("file", this.file, this.file.name);
        if (!this.isKey) formData.append("password", this.password);
        this.status = (await service({ requiresAuth: true, multipart: true }).post(`/certificates/${this.kind}`, formData)).data;
        this.cancel();
        this.$buefy.snackbar.open({ message: this.text.saved, queue: false });
      } catch (error) {
        this.$buefy.toast.open({ message: `${this.text.notSaved}: ${this.errorMessage(error)}`, type: "is-danger", duration: 6000 });
      } finally {
        this.saving = false;
      }
    },
    confirmRemove() {
      this.$buefy.dialog.confirm({
        title: this.text.removeTitle,
        message: this.text.removeMessage,
        confirmText: "Treu-lo",
        cancelText: "Cancel·la",
        type: "is-danger",
        onConfirm: () => this.remove()
      });
    },
    async remove() {
      this.saving = true;
      try {
        this.status = (await service({ requiresAuth: true }).delete(`/certificates/${this.kind}`)).data;
        this.$buefy.snackbar.open({ message: this.text.removed, queue: false });
      } catch (error) {
        this.$buefy.toast.open({ message: `No s'ha pogut treure: ${this.errorMessage(error)}`, type: "is-danger" });
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.cert-card {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  padding: 1rem;
  border: 1px solid var(--a-line);
  border-radius: 10px;
}
.cert-head {
  display: flex;
  align-items: center;
  gap: .75rem;
}
.cert-head h3 {
  font-weight: 700;
  margin: 0;
}
.cert-empty {
  color: var(--a-muted);
  margin: 0;
}
.cert-facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: .25rem 1.5rem;
  margin: 0;
}
.cert-facts dt {
  color: var(--a-muted);
}
.cert-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.cert-card .notification {
  margin: 0;
}
.cert-upload {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: .75rem 1rem;
}
.cert-upload .field {
  margin: 0;
}
.cert-upload .cert-actions {
  grid-column: 1 / -1;
}
.cert-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}
</style>
