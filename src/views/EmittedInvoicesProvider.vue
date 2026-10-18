<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" :subtitle="subtitle" />
    <!-- a user without a linked contact (an administrator…) has no invoices
         of her own: say so instead of a blank page (issues/107) -->
    <section v-if="noContact" class="section is-main-section">
      <div class="notification is-warning is-light">
        Aquesta pàgina mostra les factures de logística d'una sòcia, i el teu usuari no té cap contacte de sòcia vinculat.
        Una administradora el pot vincular des de la fitxa del contacte (camp «Usuària»).
      </div>
    </section>
    <section v-else class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year">
            <option v-for="(year, index) in years" :key="index" :value="year.year">{{ year.year }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Mes</span>
          <b-select v-model="filters.month" :disabled="filters.quarter > 0">
            <option v-for="(m, i) in months" :key="i" :value="m.month">{{ m.name }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Trimestre</span>
          <b-select v-model="filters.quarter">
            <option v-for="(m, i) in quarters" :key="i" :value="m.value">{{ m.name }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Pagada</span>
          <b-select v-model="filters.paid">
            <option v-for="(c, i) in paid" :key="i" :value="c.value">{{ c.name }}</option>
          </b-select>
        </label>
      </form>      
      <emitted-invoices-table
        :year="filters.year"
        :month="filters.month"
        :quarter="filters.quarter"
        :contact="filters.contact"
        :document-type="filters.documentType"
        :project="filters.project"
        :paid="filters.paid"
        :provider="true"
      />
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import EmittedInvoicesTable from "@/components/EmittedInvoicesTable.vue";
// import DedicationSaldo from '@/components/DedicationSaldo.vue'
import service from "@/service/index";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import moment from "moment";
import { defaultYear } from "@/domain/years";

export default {
  name: "DedicacioSaldo",
  components: {
    TitleBar,
    EmittedInvoicesTable,
    // DedicationSaldo
  },
  data() {
    return {
      isLoading: false,
      noContact: false,
      filters: {
        year: null,
        month: 0,
        quarter: 0,
        contact: 0,
        documentType: 0,
        project: 0,
        paid: 0,
      },
      years: [],
      months: [],
      quarters: [
        { name: "Tots", value: 0 },
        { name: "T1", value: 1 },
        { name: "T2", value: 2 },
        { name: "T3", value: 3 },
        { name: "T4", value: 4 },
      ],
      contacts: [],
      projects: [],
      documentTypes: [],
      treasury: [],
      treasuryData: [],
      paid: [
        { name: "Totes", value: 0 },
        { name: "Sí", value: 1 },
        { name: "No", value: 2 },]
    };
  },
  computed: {
    ...mapState(useMainStore, ["userName", "me"]),
    titleStack() {
      return ["Logística", "Factures"];
    },
    // the entity's name, not always «La Diligència»
    subtitle() {
      const entity = this.me && this.me.name ? this.me.name : "l'entitat";
      return `Les factures de logística que ${entity} t'ha emès.`;
    },
  },
  async mounted() {
    this.isLoading = true;
    var { data } = await service({ requiresAuth: true, cached: true }).get(
      "months?_sort=month"
    );
    this.months = data;
    // this.months.push({ id: 0, month: 13, name: 'T1' })
    // this.months.push({ id: 0, month: 14, name: 'T2' })
    // this.months.push({ id: 0, month: 15, name: 'T3' })
    // this.months.push({ id: 0, month: 16, name: 'T4' })
    this.months.unshift({ id: 0, month: 0, name: "Tots" });

    var { data } = await service({ requiresAuth: true }).get(
      "contacts/basic?_sort=name&_limit=-1"
    );
    this.contacts = data;
    this.contacts.unshift({ id: 0, name: "Tots" });

    var { data } = await service({ requiresAuth: true }).get(
      "projects/basic?_sort=name&_limit=-1"
    );
    this.projects = data;
    this.projects.unshift({ id: 0, name: "Tots" });

    var { data } = await service({ requiresAuth: true, cached: true }).get(
      "document-types?type=income&_limit=-1"
    );
    this.documentTypes = data;
    this.documentTypes.unshift({ id: -1, name: "Factura" });
    this.documentTypes.unshift({ id: 0, name: "Tots" });

    this.years = await service({ requiresAuth: true, cached: true })
      .get("years?_sort=year:DESC")
      .then((r) => r.data)
      

    const year = defaultYear(this.years);
    this.filters.year = year ? year.year : null;

    // the entity's name for the subtitle: the store only has it once a
    // projects screen loaded it, never for a member (`orders` only)
    if (!this.me || !this.me.name) {
      try {
        const entity = (await service({ requiresAuth: true, cached: true }).get("me")).data;
        useMainStore().setMe({ me: entity && entity.data ? entity.data : entity });
      } catch (e) {
        // keep the generic «l'entitat»
      }
    }


      const me = await service({ requiresAuth: true }).get("users/me");


      const contacts = await service({ requiresAuth: true }).get(
        "contacts?users_permissions_user=" + me.data.id
      ).then((r) => r.data);

      if (contacts.length === 0) {
        this.noContact = true;
      } else {
        this.filters.contact = contacts[0].id;
      }
      this.isLoading = false;
  },
};
</script>
<style scoped>
.is-narrow .control {
  max-width: 350px;
}
</style>