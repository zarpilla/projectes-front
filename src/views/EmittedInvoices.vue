<template>
  <div v-if="!isLoading">
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component>
        <form @submit.prevent="submit2">
          <b-field horizontal>
            <b-field label="Any">
              <b-select v-model="filters.year">
                <option
                  v-for="(year, index) in years"
                  :key="index"
                  :value="year.year"
                >
                  {{ year.year }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Mes">
              <b-select v-model="filters.month" :disabled="filters.quarter > 0">
                <option v-for="(m, i) in months" :key="i" :value="m.month">
                  {{ m.name }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Trimestre">
              <b-select v-model="filters.quarter">
                <option v-for="(m, i) in quarters" :key="i" :value="m.value">
                  {{ m.name }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Sèrie">
              <b-select v-model="filters.serial">
                <option v-for="(m, i) in serials" :key="i" :value="m.id">
                  {{ m.name }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Tipus">
              <b-select v-model="filters.documentType">
                <option v-for="(c, i) in documentTypes" :key="i" :value="c.id">
                  {{ c.name }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Contacte" class="is-narrow">
              <b-select v-model="filters.contact">
                <option v-for="(c, i) in contacts" :key="i" :value="c.id">
                  {{ c.name }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Projecte" class="is-narrow">
              <b-select v-model="filters.project">
                <option v-for="(c, i) in projects" :key="i" :value="c.id">
                  {{ c.name }}
                </option>
              </b-select>
            </b-field>
            <b-field label="Cobrada" class="is-narrow">
              <b-select v-model="filters.paid">
                <option v-for="(c, i) in paid" :key="i" :value="c.value">
                  {{ c.name }}
                </option>
              </b-select>
            </b-field>
          </b-field>
        </form>
      </card-component>
      <emitted-invoices-table
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
import TitleBar from "@/components/TitleBar";
import EmittedInvoicesTable from "@/components/EmittedInvoicesTable";
import CardComponent from "@/components/CardComponent";
// import DedicationSaldo from '@/components/DedicationSaldo'
import service from "@/service/index";
import { mapState } from "vuex";
import moment from "moment";

export default {
  name: "DedicacioSaldo",
  components: {
    CardComponent,
    TitleBar,
    EmittedInvoicesTable,
    // DedicationSaldo
  },
  data() {
    return {
      isLoading: false,
      filters: {
        year: null,
        month: 0,
        quarter: 0,
        contact: 0,
        documentType: 0,
        project: 0,
        paid: 0,
        serial: 0
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
      serials: [],
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
    ...mapState(["userName"]),
    titleStack() {
      return ["Facturació", "Ingressos"];
    },
  },
  async mounted() {
    this.isLoading = true;
    var { data } = await service({ requiresAuth: true, cached: true }).get(
      "months?_sort=month"
    );
    this.months = [...data];
    // this.months.push({ id: 0, month: 13, name: 'T1' })
    // this.months.push({ id: 0, month: 14, name: 'T2' })
    // this.months.push({ id: 0, month: 15, name: 'T3' })
    // this.months.push({ id: 0, month: 16, name: 'T4' })
    if (!this.months.find((c) => c.id === 0)) {
      this.months.unshift({ id: 0, month: 0, name: "Tots" });
    }

    var { data } = await service({ requiresAuth: true }).get(
      "contacts/basic?_sort=name&_limit=-1"
    );
    this.contacts = [...data];
    if (!this.contacts.find((c) => c.id === 0)) {
      this.contacts.unshift({ id: 0, name: "Tots" });
    }

    var { data } = await service({ requiresAuth: true }).get(
      "projects/basic?_sort=name&_limit=-1"
    );
    this.projects = [...data];
    if (!this.projects.find((c) => c.id === 0)) {
      this.projects.unshift({ id: 0, name: "Tots" });
    }
    
    var { data } = await service({ requiresAuth: true, cached: true }).get(
      "document-types?type=income&_limit=-1"
    );
    this.documentTypes = data;
    if (!this.documentTypes.find((c) => c.id === -1)) {
      this.documentTypes.unshift({ id: -1, name: "Factura" });
      this.documentTypes.unshift({ id: 0, name: "Tots" });
    }
    
    var { data } = await service({ requiresAuth: true, cached: true }).get(
      "series?_limit=-1"
    );

    this.serials = [...data]
    if (!this.serials.find((c) => c.id === 0)) {
      this.serials.unshift({ id: 0, name: "Totes" });
    }

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
};
</script>
<style scoped>
.is-narrow .control {
  max-width: 350px;
}
</style>