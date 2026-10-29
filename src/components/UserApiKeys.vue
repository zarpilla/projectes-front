<template>
  <!-- Claus d'API de la usuària (Administració › Usuàries): the integrations
       API lets a member's own system create and cancel her orders and delivery
       points without the CSV import. Only the key's prefix is kept: the key
       itself is shown once, right after it is created. -->
  <section class="form-box keys-box" data-test="api-keys">
    <header class="keys-head">
      <h2>Claus d'API</h2>
      <b-button
        v-if="canHave"
        size="is-small"
        type="is-primary"
        icon-left="key-plus"
        :loading="creating"
        data-test="api-key-create"
        @click="askName"
      >
        Crea una clau
      </b-button>
    </header>
    <p class="keys-sub">
      Perquè el programa de gestió de la sòcia creï, actualitzi i anul·li comandes i punts d'entrega sense passar pel CSV.
      Les comandes segueixen les mateixes normes que a l'aplicació.
    </p>

    <p v-if="!canHave" class="keys-note" data-test="api-keys-no-orders">
      Només les usuàries amb el permís <b>Logística</b> poden tenir claus d'API.
    </p>

    <div v-if="newKey" class="new-key" data-test="api-key-new">
      <p><b>Copia ara la clau i guarda-la en un lloc segur.</b> No es tornarà a mostrar.</p>
      <div class="new-key-row">
        <code data-test="api-key-value">{{ newKey.key }}</code>
        <b-button size="is-small" icon-left="content-copy" data-test="api-key-copy" @click="copy">{{ copied ? "Copiada" : "Copia" }}</b-button>
      </div>
      <p class="keys-note">S'envia a la capçalera <code>x-api-key</code> de cada petició.</p>
      <b-button size="is-small" data-test="api-key-done" @click="newKey = null">Fet</b-button>
    </div>

    <table v-if="keys.length" class="table is-fullwidth keys-table">
      <thead>
        <tr>
          <th>Clau</th>
          <th>Últim ús</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="k in keys" :key="k.id" :class="{ 'is-revoked': !k.active }" data-test="api-key-row">
          <td>
            <b>{{ k.name || "Sense nom" }}</b>
            <small><code>{{ k.prefix }}…</code> · creada {{ day(k.createdAt) }}</small>
          </td>
          <td>{{ k.lastUsedAt ? dayTime(k.lastUsedAt) : "Mai" }}</td>
          <td class="has-text-right">
            <b-button
              v-if="k.active"
              size="is-small"
              type="is-danger"
              outlined
              data-test="api-key-revoke"
              @click="askRevoke(k)"
            >
              Revoca
            </b-button>
            <span v-else class="tag is-light">Revocada {{ day(k.revokedAt) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="canHave && !loading" class="keys-note">Encara no té cap clau.</p>
  </section>
</template>

<script>
import service from '@/service/index';
import moment from 'moment';

export default {
  name: 'UserApiKeys',
  props: {
    userId: {
      type: [String, Number],
      required: true
    },
    // the user has the orders permission (the API writes her orders)
    canHave: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      keys: [],
      loading: false,
      creating: false,
      newKey: null,
      copied: false
    };
  },
  watch: {
    userId() {
      this.load();
    }
  },
  mounted() {
    this.load();
  },
  methods: {
    day(value) {
      return value ? moment(value).format('DD/MM/YYYY') : '';
    },
    dayTime(value) {
      return value ? moment(value).format('DD/MM/YYYY HH:mm') : '';
    },
    async load() {
      this.loading = true;
      try {
        this.keys = (await service({ requiresAuth: true }).get(`integrations/api-keys?user=${this.userId}`)).data || [];
      } catch (error) {
        this.keys = [];
      } finally {
        this.loading = false;
      }
    },
    askName() {
      this.$buefy.dialog.prompt({
        title: "Nova clau d'API",
        message: 'Un nom per reconèixer-la (p. ex. el programa que la fa servir).',
        inputAttrs: { placeholder: 'Programa de comandes', maxlength: 100, required: false },
        confirmText: 'Crea la clau',
        cancelText: 'Cancel·la',
        trapFocus: true,
        onConfirm: name => this.create(name)
      });
    },
    async create(name) {
      this.creating = true;
      try {
        const created = (await service({ requiresAuth: true }).post('integrations/api-keys', { user: Number(this.userId), name: name || null })).data;
        this.newKey = created;
        this.copied = false;
        await this.load();
      } catch (error) {
        const message = (error.response && error.response.data && error.response.data.error && error.response.data.error.message) || error.message;
        this.$buefy.toast.open({ message: `No s'ha pogut crear la clau: ${message}`, type: 'is-danger' });
      } finally {
        this.creating = false;
      }
    },
    async copy() {
      try {
        await navigator.clipboard.writeText(this.newKey.key);
        this.copied = true;
      } catch (error) {
        this.$buefy.toast.open({ message: 'No s\'ha pogut copiar: selecciona-la i copia-la a mà', type: 'is-warning' });
      }
    },
    askRevoke(key) {
      this.$buefy.dialog.confirm({
        title: 'Revocar la clau',
        message: `El programa que fa servir la clau «${key.name || key.prefix}» deixarà de poder enviar comandes. No es pot desfer.`,
        confirmText: 'Revoca',
        cancelText: 'Cancel·la',
        type: 'is-danger',
        onConfirm: () => this.revoke(key)
      });
    },
    async revoke(key) {
      try {
        await service({ requiresAuth: true }).delete(`integrations/api-keys/${key.id}`);
        this.$buefy.toast.open({ message: 'Clau revocada', type: 'is-success' });
        await this.load();
      } catch (error) {
        this.$buefy.toast.open({ message: `No s'ha pogut revocar: ${error.message}`, type: 'is-danger' });
      }
    }
  }
};
</script>

<style scoped>
.form-box {
  background: var(--a-surface);
  border: 1px solid var(--a-line);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
}
.keys-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .5rem;
}
.keys-head h2 {
  font-size: 1rem;
  font-weight: 800;
}
.keys-sub,
.keys-note {
  font-size: .8125rem;
  color: var(--a-fg-2);
  margin: .5rem 0;
}
.new-key {
  border: 1px solid var(--a-accent);
  background: var(--a-accent-soft);
  border-radius: 10px;
  padding: .75rem;
  margin: .75rem 0;
  font-size: .875rem;
}
.new-key-row {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin: .5rem 0;
}
.new-key-row code {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  user-select: all;
  font-size: .8125rem;
}
.keys-table {
  font-size: .875rem;
  margin-top: .5rem;
}
.keys-table small {
  display: block;
  color: var(--a-fg-2);
}
.keys-table tr.is-revoked td {
  color: var(--a-muted);
}
</style>
