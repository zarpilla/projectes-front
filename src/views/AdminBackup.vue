<template>
  <!-- «Còpia de seguretat»: last night's dump of the entity's own database
       (.sql.gz). The server writes it every night, one entity after another;
       here the admins only download it (GET backup/latest[/download]). -->
  <div class="admin-backup">
    <title-bar :title-stack="['Administració', 'Còpia de seguretat']" />

    <section class="section is-main-section">
      <section class="a-box bk-box">
        <header class="box-head"><h2>Còpia de la base de dades</h2></header>
        <b-loading :is-full-page="false" :model-value="isLoading" />

        <p v-if="loadError" class="has-text-danger" data-test="backup-error">No s'ha pogut consultar: {{ loadError }}</p>
        <p v-else-if="info && info.enabled === false" class="has-text-muted" data-test="backup-disabled">
          Aquesta entitat no té còpies de seguretat per descarregar.
        </p>
        <template v-else-if="info">
          <dl v-if="info.available" class="bk-facts" data-test="backup-facts">
            <dt>Feta</dt><dd>{{ createdAt }}</dd>
            <dt>Mida</dt><dd>{{ size }}</dd>
            <dt>Fitxer</dt><dd><code>{{ info.filename }}</code></dd>
          </dl>
          <p v-else class="has-text-muted" data-test="backup-none">
            Encara no hi ha cap còpia. Es fa cada nit: torna-hi demà.
          </p>
        </template>

        <p v-if="!disabled" class="has-text-muted bk-help">
          Cada nit es fa una còpia de totes les dades de l'entitat i substitueix la de la nit anterior.
          És un fitxer de MySQL comprimit (.sql.gz): serveix per guardar-lo o per restaurar-lo en un servidor.
          No inclou els fitxers pujats (documents, imatges).
        </p>

        <div v-if="!disabled" class="bk-actions">
          <b-button
            type="is-primary"
            icon-left="download"
            :disabled="!info || !info.available"
            :loading="downloading"
            data-test="backup-download"
            @click="download"
          >Descarrega la còpia</b-button>
        </div>
      </section>
    </section>
  </div>
</template>

<script>
import moment from "moment";
import TitleBar from "@/components/TitleBar.vue";
import service from "@/service/index";

export default {
  name: "AdminBackup",
  components: { TitleBar },
  data() {
    return {
      isLoading: false,
      downloading: false,
      info: null,
      loadError: null
    };
  },
  computed: {
    // the host gives this entity no copies (tenant-dumps.skip, e.g. demo)
    disabled() {
      return !!this.info && this.info.enabled === false;
    },
    createdAt() {
      return moment(this.info.createdAt).format("DD/MM/YYYY [a les] HH:mm");
    },
    size() {
      const mb = (this.info.bytes || 0) / 1048576;
      return `${mb.toLocaleString("ca-ES", { maximumFractionDigits: 1 })} MB`;
    }
  },
  async mounted() {
    await this.load();
  },
  methods: {
    errorMessage(error) {
      const data = error.response && error.response.data;
      return (data && data.error && data.error.message) || (data && data.message) || error.message;
    },
    async load() {
      this.isLoading = true;
      try {
        this.info = (await service({ requiresAuth: true }).get("backup/latest")).data;
        this.loadError = null;
      } catch (error) {
        this.loadError = this.errorMessage(error);
      } finally {
        this.isLoading = false;
      }
    },
    async download() {
      this.downloading = true;
      try {
        const { data } = await service({ requiresAuth: true }).get("backup/latest/download", { responseType: "blob" });
        const url = URL.createObjectURL(data);
        const link = document.createElement("a");
        link.href = url;
        link.download = this.info.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        this.$buefy.toast.open({ message: `No s'ha pogut descarregar: ${this.errorMessage(error)}`, type: "is-danger" });
      } finally {
        this.downloading = false;
      }
    }
  }
};
</script>

<style scoped>
.bk-box {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: .75rem;
}
.bk-facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: .25rem 1.5rem;
  margin: 0;
  font-size: .875rem;
}
.bk-facts code {
  font-size: inherit;
  color: inherit;
  background: none;
  padding: 0;
}
.bk-facts dt {
  color: var(--a-muted);
}
.bk-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.bk-help {
  font-size: .875rem;
  margin: 0;
}
.bk-actions {
  display: flex;
  gap: .5rem;
}
</style>
