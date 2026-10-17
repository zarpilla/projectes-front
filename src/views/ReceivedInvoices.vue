<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <b-input v-model="codeSearch" class="filter-grow" icon="magnify" placeholder="Cerca per codi" aria-label="Codi" />
        <label class="filter-select">
          <span>Any</span>
          <b-select v-model="filters.year" required>
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
          <span>Sèrie</span>
          <b-select v-model="filters.serial">
            <option v-for="(m, i) in serials" :key="i" :value="m.id">{{ m.name }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Tipus</span>
          <b-select v-model="filters.documentType">
            <option v-for="(c, i) in documentTypes" :key="i" :value="c.id">{{ c.name }}</option>
          </b-select>
        </label>
        <label class="filter-select">
          <span>Pagada</span>
          <b-select v-model="filters.paid">
            <option v-for="(c, i) in paid" :key="i" :value="c.value">{{ c.name }}</option>
          </b-select>
        </label>
        <b-autocomplete
          v-model="contactNameSearch"
          class="filter-grow"
          placeholder="Contacte"
          aria-label="Contacte"
          icon="account-outline"
          :keep-first="false"
          :open-on-focus="true"
          :data="filteredContacts"
          field="name"
          :clearable="true"
          @select="option => (filters.contact = option ? option.id : 0)"
        />
        <b-autocomplete
          v-model="projectNameSearch"
          class="filter-grow"
          placeholder="Projecte"
          aria-label="Projecte"
          icon="folder-outline"
          :keep-first="false"
          :open-on-focus="true"
          :data="filteredProjects"
          field="name"
          :clearable="true"
          @select="option => (filters.project = option ? option.id : 0)"
        />
      </form>
      <received-invoices-table
        :code="filters.code"
        :year="filters.year"
        :month="filters.month"
        :quarter="filters.quarter" 
        :contact="filters.contact"
        :document-type="filters.documentType"
        :project="filters.project"
        :paid="filters.paid"
        :serial="filters.serial"
      />
    </section>
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import ReceivedInvoicesTable from "@/components/ReceivedInvoicesTable.vue";
import service from "@/service/index";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import moment from "moment";

export default {
  name: "ReceivedInvoices",
  components: {
    TitleBar,
    ReceivedInvoicesTable,
  },
  data() {
    return {
      isLoading: false,
      codeSearch: '',
      codeDebounceTimer: null,
      filters: {
        code: '',
        year: null,
        month: 0,
        quarter: 0,
        contact: 0,
        documentType: 0,
        project: 0,
        paid: 0,
        serial: 0,
      },
      years: [],
      months: [],
      quarters: [{ name: 'Tots', value: 0 },{name: 'T1', value: 1},{name: 'T2', value: 2},{name: 'T3', value: 3},{name: 'T4', value: 4}],
      contacts: [],
      projects: [],
      documentTypes: [],
      treasury: [],
      treasuryData: [],
      paid: [
        { name: "Totes", value: 0 },
        { name: "Sí", value: 1 },
        { name: "No", value: 2 },
      ],
      serials: [],
      contactNameSearch: '',
      projectNameSearch: ''
    };
  },
  watch: {
    codeSearch(newVal) {
      if (this.codeDebounceTimer) {
        clearTimeout(this.codeDebounceTimer);
      }
      this.codeDebounceTimer = setTimeout(() => {
        this.filters.code = newVal;
      }, 500);
    }
  },
  computed: {
    ...mapState(useMainStore, ["userName"]),
    titleStack() {
      return ["Diners", "Despeses"];
    },
    filteredContacts () {
      return this.contacts.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.contactNameSearch.toLowerCase()) >= 0
        )
      })
    },
    filteredProjects () {
      return this.projects.filter(option => {
        return (
          option.name
            .toString()
            .toLowerCase()
            .indexOf(this.projectNameSearch.toLowerCase()) >= 0
        )
      })
    }
  },
  mounted() {
    this.getData();
  },
  methods: {
    async getData() {
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
        "document-types?type=expense&_limit=-1"
      );
      this.documentTypes = [...data];
      this.documentTypes.unshift({ id: -1, name: "Factura" });
      this.documentTypes.push({ id: -2, name: "Nómina" });
      this.documentTypes.unshift({ id: 0, name: "Tots" });

      this.serials = await service({ requiresAuth: true, cached: true }).get(
        "series?_limit=-1"
      ).then(r => r.data);

      this.serials.unshift({ id: 0, name: "Totes" });

      service({ requiresAuth: true, cached: true })
        .get("years?_sort=year:DESC")
        .then((r) => {
          this.years = r.data;
          this.filters.year = this.years.find(
            (y) => y.year.toString() === moment().format("YYYY")
          ).year;
          this.isLoading = false;
        });
    },
  },
};
</script>
<style scoped>
.is-narrow .control {
  max-width: 350px;
}
</style>