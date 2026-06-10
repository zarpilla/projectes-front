<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card modal-card-dir3">
      <header class="modal-card-head">
        <p class="modal-card-title">Cerca DIR3</p>
      </header>
      <section class="modal-card-body">
        <b-field label="Tipus de cerca">
          <div class="buttons has-addons">
            <b-button
              :type="searchType === 'nif' ? 'is-primary' : ''"
              @click="searchType = 'nif'"
            >
              NIF
            </b-button>
            <b-button
              :type="searchType === 'name' ? 'is-primary' : ''"
              @click="searchType = 'name'"
            >
              Nom
            </b-button>
          </div>
        </b-field>

        <b-field :label="searchType === 'nif' ? 'NIF' : 'Nom'">
          <b-input
            v-model="searchQuery"
            :placeholder="searchType === 'nif' ? 'Introdueix el NIF' : 'Introdueix el nom'"
            @keyup.enter="search"
          />
        </b-field>

        <b-field>
          <b-button type="is-primary" @click="search" :loading="isLoading">
            Cerca
          </b-button>
        </b-field>

        <div v-if="errorMessage" class="notification is-danger">
          {{ errorMessage }}
        </div>

        <div v-if="results.length > 0" class="results-container mt-4">
          <p class="has-text-weight-bold mb-3">
            Resultats ({{ results.length }})
          </p>
          <div
            v-for="(result, index) in results"
            :key="index"
            class="box result-item"
            @click="selectResult(result)"
            style="cursor: pointer"
          >
            <div class="columns is-mobile">
              <div class="column">
                <p class="has-text-weight-bold">
                  {{ getResultName(result) }}
                </p>
                <p v-if="result.og && result.og.identifier" class="is-size-7">
                  <strong>NIF:</strong> {{ result.og.identifier }}
                </p>
                <div class="mt-2">
                  <p v-if="result.og && result.og.code" class="is-size-7">
                    <strong>DIR3 OG:</strong> {{ result.og.code }}
                    <span v-if="result.og.name" class="ml-2">{{ result.og.name }}</span>
                  </p>
                  <p v-if="result.oc && result.oc.code" class="is-size-7">
                    <strong>DIR3 OC:</strong> {{ result.oc.code }}
                    <span v-if="result.oc.name" class="ml-2">{{ result.oc.name }}</span>
                  </p>
                  <p v-if="result.ut && result.ut.code" class="is-size-7">
                    <strong>DIR3 UT:</strong> {{ result.ut.code }}
                    <span v-if="result.ut.name" class="ml-2">{{ result.ut.name }}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="searched && results.length === 0 && !isLoading && !errorMessage" class="notification is-info">
          No s'han trobat resultats
        </div>
      </section>
      <footer class="modal-card-foot">
        <button class="button" type="button" @click="cancel">
          Tanca
        </button>
      </footer>
    </div>
  </b-modal>
</template>

<script>
import service from '@/service/index';

export default {
  name: 'ModalBoxDir3',
  props: {
    isActive: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isModalActive: false,
      searchType: 'nif',
      searchQuery: '',
      results: [],
      isLoading: false,
      errorMessage: '',
      searched: false
    };
  },
  watch: {
    isActive(newValue) {
      this.isModalActive = newValue;
      if (newValue) {
        this.resetSearch();
      }
    },
    isModalActive(newValue) {
      if (!newValue) {
        this.cancel();
      }
    }
  },
  methods: {
    getResultName(result) {
      if (result.administration && result.administration.name) {
        return result.administration.name;
      }
      if (result.og && result.og.name) {
        return result.og.name;
      }
      if (result.oc && result.oc.name) {
        return result.oc.name;
      }
      if (result.ut && result.ut.name) {
        return result.ut.name;
      }
      return 'Sense nom';
    },
    resetSearch() {
      this.searchQuery = '';
      this.results = [];
      this.errorMessage = '';
      this.searched = false;
    },
    async search() {
      if (!this.searchQuery || !this.searchQuery.trim()) {
        this.errorMessage = 'Introdueix un valor per cercar';
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';
      this.results = [];
      this.searched = true;

      try {
        const endpoint = this.searchType === 'nif' 
          ? `me/dir3/search/nif/${encodeURIComponent(this.searchQuery.trim())}`
          : `me/dir3/search/name/${encodeURIComponent(this.searchQuery.trim())}`;

        const response = await service({ requiresAuth: true }).get(endpoint);

        if (response.data.success) {
          this.results = response.data.results || [];
        } else {
          this.errorMessage = 'Error en la cerca';
        }
      } catch (error) {
        console.error('Error searching DIR3:', error);
        if (error.response) {
          if (error.response.status === 401 || error.response.status === 403) {
            this.errorMessage = 'Error d\'autenticació.';
          } else if (error.response.status === 404) {
            this.errorMessage = 'No s\'han trobat resultats';
          } else if (error.response.status === 400) {
            const errorMsg = error.response.data && error.response.data.message 
              ? error.response.data.message 
              : 'Error de configuració';
            this.errorMessage = errorMsg;
          } else {
            const errorMsg = error.response.data && error.response.data.message 
              ? error.response.data.message 
              : error.message;
            this.errorMessage = `Error: ${errorMsg}`;
          }
        } else if (error.request) {
          this.errorMessage = 'No s\'ha pogut connectar amb el servidor.';
        } else {
          this.errorMessage = `Error: ${error.message}`;
        }
      } finally {
        this.isLoading = false;
      }
    },
    selectResult(result) {
      const og = result.og && result.og.code ? result.og.code : null;
      const oc = result.oc && result.oc.code ? result.oc.code : null;
      const ut = result.ut && result.ut.code ? result.ut.code : null;
      const nif = result.og && result.og.identifier ? result.og.identifier : null;
      
      let name = null;
      if (result.administration && result.administration.name) {
        name = result.administration.name;
      } else if (result.og && result.og.name) {
        name = result.og.name;
      } else if (result.oc && result.oc.name) {
        name = result.oc.name;
      } else if (result.ut && result.ut.name) {
        name = result.ut.name;
      }
      
      this.$emit('select', {
        og: og,
        oc: oc,
        ut: ut,
        name: name,
        nif: nif
      });
      this.isModalActive = false;
    },
    cancel() {
      this.$emit('cancel');
    }
  }
};
</script>

<style scoped>
.modal-card-dir3 {
  width: 640px;
  max-width: 90vw;
}

.results-container {
  max-height: 400px;
  overflow-y: auto;
}

.result-item:hover {
  background-color: #f5f5f5;
  border-color: #3273dc;
}
</style>
