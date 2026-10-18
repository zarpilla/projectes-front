<template>
  <!-- The supporters' logos («Amb el suport de») of the login page and the side
       menu (issues/159): add, reorder, link and trash them. A trashed logo is
       hidden, never removed, and can be brought back. -->
  <div class="admin-logos">
    <title-bar :title-stack="['Administració', 'Logos']" :subtitle="headline">
      <b-button type="is-primary" icon-left="plus" :loading="uploading" @click="pick">Afegeix un logo</b-button>
    </title-bar>
    <input ref="file" type="file" accept="image/*" class="is-hidden" data-test="logo-file" @change="onPick" />

    <section class="section is-main-section">
      <section class="a-box lg-box">
        <header class="box-head"><h2>Logos que es mostren</h2></header>
        <b-loading :is-full-page="false" :model-value="isLoading" />
        <p class="has-text-muted lg-help">
          Surten a la pantalla d'entrada i sota el menú, en aquest ordre. Amb una adreça web, el logo hi porta.
        </p>
        <ul class="lg-list">
          <li v-for="(logo, i) in shown" :key="logo.id" class="lg-item" data-test="logo-row">
            <div class="lg-image">
              <img v-if="imageUrl(logo)" :src="imageUrl(logo)" alt="" />
              <span v-else class="has-text-muted">Sense imatge</span>
            </div>
            <b-field class="lg-url" label="Adreça web" label-position="inside">
              <b-input
                v-model="urls[logo.id]"
                type="url"
                placeholder="https://"
                :aria-label="`Adreça web del logo ${i + 1}`"
                @blur="saveUrl(logo)"
                @keyup.enter="saveUrl(logo)"
              />
            </b-field>
            <div class="lg-actions">
              <b-button size="is-small" icon-left="arrow-up" :disabled="saving || i === 0" aria-label="Puja" title="Puja" @click="move(logo, -1)" />
              <b-button size="is-small" icon-left="arrow-down" :disabled="saving || i === shown.length - 1" aria-label="Baixa" title="Baixa" @click="move(logo, 1)" />
              <b-button size="is-small" icon-left="trash-can-outline" type="is-danger" outlined :disabled="saving" @click="trash(logo)">Esborra</b-button>
            </div>
          </li>
          <li v-if="!isLoading && !shown.length" class="lg-empty">No hi ha cap logo. Afegeix-ne un amb «Afegeix un logo».</li>
        </ul>
      </section>

      <section v-if="trashed.length" class="a-box lg-box">
        <header class="box-head"><h2>Esborrats</h2></header>
        <ul class="lg-list">
          <li v-for="logo in trashed" :key="logo.id" class="lg-item is-trashed" data-test="trashed-row">
            <div class="lg-image">
              <img v-if="imageUrl(logo)" :src="imageUrl(logo)" alt="" />
            </div>
            <span class="lg-url has-text-muted">{{ logo.url || "Sense adreça" }}</span>
            <div class="lg-actions">
              <b-button size="is-small" icon-left="restore" :disabled="saving" @click="restore(logo)">Recupera</b-button>
            </div>
          </li>
        </ul>
      </section>
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import service from "@/service/index";
import getConfig from "@/config";
import { sortLogos, shownLogos, nextLogoOrder, moveLogo } from "@/domain/logos";

export default {
  name: "AdminLogos",
  components: { TitleBar },
  data() {
    return {
      isLoading: false,
      saving: false,
      uploading: false,
      logos: [],
      urls: {}
    };
  },
  computed: {
    shown() {
      return shownLogos(this.logos);
    },
    trashed() {
      return sortLogos(this.logos.filter(l => l.trashed));
    },
    headline() {
      if (this.isLoading) return "";
      const n = this.shown.length;
      return `${n} ${n === 1 ? "logo es mostra" : "logos es mostren"}${this.trashed.length ? ` · ${this.trashed.length} esborrats` : ""}`;
    }
  },
  async mounted() {
    await this.getData();
  },
  methods: {
    async getData() {
      this.isLoading = true;
      try {
        this.logos = (await service({ requiresAuth: true }).get("logos?_limit=-1&_sort=order:ASC")).data || [];
        this.urls = Object.fromEntries(this.logos.map(l => [l.id, l.url || ""]));
      } catch (e) {
        this.fail("No s'han pogut carregar els logos", e);
      } finally {
        this.isLoading = false;
      }
    },
    imageUrl(logo) {
      const url = logo.logo && logo.logo.url;
      if (!url) return "";
      return /^https?:/.test(url) ? url : getConfig().VUE_APP_API_URL + url;
    },
    fail(message, e) {
      const reason = e && e.response && e.response.data && e.response.data.message;
      this.$buefy.toast.open({ message: reason ? `${message}: ${reason}` : message, type: "is-danger", duration: 5000 });
    },
    pick() {
      this.$refs.file.click();
    },
    onPick(e) {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (file) this.add(file);
    },
    // upload the image (as the settings' logo, MeForm), then add it at the end
    async add(file) {
      if (!/^image\//.test(file.type)) {
        this.$buefy.toast.open({ message: "El logo ha de ser una imatge (PNG, JPG o SVG)", type: "is-danger" });
        return;
      }
      this.uploading = true;
      try {
        const formData = new FormData();
        formData.append("files", file, file.name);
        const uploaded = (await service({ requiresAuth: true, multipart: true }).post("upload", formData)).data;
        const image = Array.isArray(uploaded) ? uploaded[0] : uploaded;
        await service({ requiresAuth: true }).post("logos", { logo: image.id, order: nextLogoOrder(this.logos), trashed: false });
        this.$buefy.snackbar.open({ message: "Logo afegit", queue: false });
        await this.getData();
      } catch (e) {
        this.fail("No s'ha pogut afegir el logo", e);
      } finally {
        this.uploading = false;
      }
    },
    async update(changes) {
      this.saving = true;
      try {
        for (const { id, ...data } of changes) {
          await service({ requiresAuth: true }).put(`logos/${id}`, data);
        }
        return true;
      } catch (e) {
        this.fail("No s'ha pogut desar", e);
        return false;
      } finally {
        this.saving = false;
        await this.getData();
      }
    },
    async saveUrl(logo) {
      const url = (this.urls[logo.id] || "").trim();
      if (url === (logo.url || "")) return;
      if (await this.update([{ id: logo.id, url: url || null }])) {
        this.$buefy.snackbar.open({ message: "Adreça desada", queue: false });
      }
    },
    move(logo, delta) {
      const changes = moveLogo(this.logos, logo.id, delta);
      if (changes.length) return this.update(changes);
    },
    trash(logo) {
      this.$buefy.dialog.confirm({
        title: "Esborrar el logo",
        message: "Deixarà de sortir a la pantalla d'entrada i al menú. El pots recuperar més avall.",
        confirmText: "Esborra",
        cancelText: "Cancel·la",
        type: "is-danger",
        onConfirm: () => this.update([{ id: logo.id, trashed: true }])
      });
    },
    restore(logo) {
      return this.update([{ id: logo.id, trashed: false, order: nextLogoOrder(this.logos) }]);
    }
  }
};
</script>

<style scoped>
.lg-box {
  position: relative;
  margin-bottom: 1.5rem;
}
.lg-help {
  font-size: .875rem;
  margin-bottom: .75rem;
}
.lg-list {
  display: flex;
  flex-direction: column;
}
.lg-item {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  padding: .75rem 0;
  border-top: 1px solid var(--a-line-soft);
}
.lg-item:first-child {
  border-top: 0;
}
.lg-image {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 4rem;
  padding: .25rem;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--a-line);
}
.lg-image img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}
.lg-url {
  margin-bottom: 0 !important;
}
.lg-actions {
  display: flex;
  gap: .25rem;
}
.is-trashed .lg-image {
  opacity: .55;
}
.lg-empty {
  padding: 1.5rem;
  text-align: center;
  color: var(--a-muted);
}
@media screen and (max-width: 768px) {
  .lg-item {
    grid-template-columns: 5rem minmax(0, 1fr);
  }
  .lg-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}
</style>
