<template>
  <!-- The server's read cache (issues/307): what it keeps, and «Buida la
       memòria cau» for a change made straight in the database, which the
       server sees within seconds but not always (docs/READ_CACHE.md). -->
  <div class="cache-card">
    <div class="cache-head">
      <h3>Memòria cau del servidor</h3>
      <span v-if="stats" class="tag" :class="stats.on ? 'is-success is-light' : ''">{{ stats.on ? "Activa" : "Desactivada" }}</span>
    </div>

    <p v-if="loadError" class="cache-empty">No s'ha pogut consultar: {{ loadError }}</p>
    <dl v-else-if="stats" class="cache-facts">
      <dt>Respostes guardades</dt><dd>{{ stats.entries }}</dd>
      <dt>Memòria</dt><dd>{{ megabytes(stats.bytes) }} de {{ megabytes(stats.maxBytes) }}</dd>
      <dt>Servides des de la memòria</dt><dd>{{ hitRate }}</dd>
    </dl>

    <p class="cache-help">
      El servidor guarda les respostes que es demanen sovint (taules auxiliars, Tresoreria, informes) i les
      descarta soles quan canvien les dades. Buida-la només si s'han canviat dades directament a la base de dades.
    </p>
    <div class="cache-actions">
      <b-button class="cache-clear" :loading="clearing" @click="confirmClear">Buida la memòria cau</b-button>
    </div>
  </div>
</template>

<script>
import service from "@/service/index";

export default {
  name: "ReadCacheCard",
  data() {
    return {
      stats: null,
      loadError: null,
      clearing: false
    };
  },
  computed: {
    hitRate() {
      const asked = (this.stats.hits || 0) + (this.stats.misses || 0);
      return asked ? `${Math.round((100 * this.stats.hits) / asked)} % de ${asked} des que ha arrencat` : "—";
    }
  },
  async mounted() {
    await this.load();
  },
  methods: {
    megabytes(bytes) {
      return `${((bytes || 0) / 1048576).toLocaleString("ca-ES", { maximumFractionDigits: 1 })} MB`;
    },
    errorMessage(error) {
      return (error.response && error.response.data && error.response.data.message) || error.message;
    },
    async load() {
      try {
        this.stats = (await service({ requiresAuth: true }).get("read-cache/stats")).data;
        this.loadError = null;
      } catch (error) {
        this.loadError = this.errorMessage(error);
      }
    },
    confirmClear() {
      this.$buefy.dialog.confirm({
        title: "Buidar la memòria cau",
        message:
          "Les respostes guardades es tornaran a calcular quan es demanin: les primeres pantalles aniran més lentes una estona. Vols continuar?",
        confirmText: "Buida-la",
        cancelText: "Cancel·la",
        onConfirm: () => this.clear()
      });
    },
    async clear() {
      this.clearing = true;
      try {
        const { cleared } = (await service({ requiresAuth: true }).post("read-cache/clear")).data || {};
        this.$buefy.snackbar.open({
          message: `Memòria cau buidada (${cleared || 0} ${cleared === 1 ? "resposta" : "respostes"})`,
          queue: false
        });
        await this.load();
      } catch (error) {
        this.$buefy.toast.open({ message: `No s'ha pogut buidar: ${this.errorMessage(error)}`, type: "is-danger" });
      } finally {
        this.clearing = false;
      }
    }
  }
};
</script>

<style scoped>
.cache-card {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  padding: 1rem;
  border: 1px solid var(--a-line);
  border-radius: 10px;
}
.cache-head {
  display: flex;
  align-items: center;
  gap: .75rem;
}
.cache-head h3 {
  font-weight: 700;
  margin: 0;
}
.cache-empty,
.cache-help {
  color: var(--a-muted);
  margin: 0;
}
.cache-facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: .25rem 1.5rem;
  margin: 0;
}
.cache-facts dt {
  color: var(--a-muted);
}
.cache-facts dd {
  margin: 0;
}
.cache-actions {
  display: flex;
  gap: .5rem;
}
</style>
