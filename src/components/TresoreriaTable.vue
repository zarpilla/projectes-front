<template>
  <div>
    <modal-box-invoicing
      :is-active="isModalActive"
      :invoicing-object="trashObject"
      @submit="modalSubmit"
      @cancel="modalCancel"
    />
    <download-excel
      class="export view-button"
      :data="pivotData"
      v-if="treasuryData && treasuryData.length"
    >
      <b-button
        title="Exporta dades"
        class="zview-button"
        :type="'is-disabled'"
        icon-left="file-excel"
      />
    </download-excel>

    <!-- <pre>{{ pivotData }}</pre> -->

    <card-component title="PREVISIÓ DE TRESORERIA" class="ztile is-child mt-2">
      <section class="section">
        <div class="b-table treasury-table">
          <div
            class="
              table-wrapper
              has-mobile-cards has-sticky-header
              table-container
            "
          >
            <table class="table">
              <thead>
                <th></th>
                <th class="has-text-right">
                  <div class="zth-wrap has-text-right">
                    <span class="is-relative"> Avui </span>
                  </div>
                </th>
                <th
                  class="has-text-right"
                  v-for="(column, i) in pivotData"
                  :key="i"
                >
                  <div class="zth-wrap has-text-right">
                    <span
                      class="is-relative"
                      v-if="column.month !== '00' && column.month !== '99'"
                    >
                      {{ column.month }} / {{ column.year }}
                    </span>
                    <span class="is-relative" v-if="column.month == '00'">
                      TOTAL {{ column.year }}
                      <b-icon
                        class="has-text-danger"
                        icon="star"
                        size="is-small"
                      >
                      </b-icon>
                    </span>
                    <span class="is-relative" v-if="column.month == '99'">
                      SENSE DATA
                      <b-icon
                        class="has-text-danger"
                        icon="alert-circle"
                        size="is-small"
                      >
                      </b-icon>
                    </span>
                  </div>
                </th>
              </thead>
              <tbody>
                <tr>
                  <td class="has-text-weight-bold">Cobraments</td>
                  <td class="has-text-right"></td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in pivotData"
                    :key="i"
                  >
                    {{ formatPrice(data.total_incomes) }} €
                  </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Pagaments</td>
                  <td class="has-text-right"></td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in pivotData"
                    :key="i"
                  >
                    {{ formatPrice(data.total_expenses) }} €
                  </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Resultat</td>
                  <td class="has-text-right"></td>
                  <td
                    class="has-text-right"
                    v-for="(data, i) in pivotData"
                    :key="i"
                  >
                    {{ formatPrice(data.total_amount) }} €
                  </td>
                </tr>
                <tr>
                  <td class="has-text-weight-bold">Saldo</td>
                  <td class="has-text-right">
                    {{ formatPrice(todaySubTotal) }}€
                  </td>
                  <td
                    class="has-text-right has-text-weight-bold"
                    v-for="(data, i) in pivotData"
                    :key="i"
                  >
                    {{ formatPrice(data.subtotal) }} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </card-component>

    <card-component
      title="IVA"
      class="ztile is-child mt-2"
      v-if="
        me &&
        me.options &&
        me.options.deductible_vat_pct &&
        me.options.deductible_vat_pct > 0
      "
    >
      <div class="columns">
        <div class="column">
          <b-field label="Pagat" grouped class="column">
            <div class="readonly subphase-detail-input">
              <money-format
                :value="vat.paid"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Cobrat" grouped class="column">
            <div class="readonly subphase-detail-input">
              <money-format
                :value="vat.received"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
            </div>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Deduïble" grouped class="column">
            <div class="readonly subphase-detail-input">
              {{ me.options.deductible_vat_pct }}%
            </div>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Saldo" grouped class="column">
            <money-format
                :value="(vat.paid - vat.received) * me.options.deductible_vat_pct / 100"
                :locale="'es'"
                :currency-code="'EUR'"
                :subunits-value="false"
                :hide-subunits="false"
              >
              </money-format>
          </b-field>
        </div>
        <div class="column">
          <b-field label="Saldar" grouped class="column">
            <button class="button is-primary" @click="payVat" :disabled="(vat.paid - vat.received === 0) || payingVat">
              {{ payingVat ? '...' : 'Saldar'}}</button>
          </b-field>
        </div>
      </div>
    </card-component>



    <download-excel
      class="export view-button"
      :data="treasuryData"
      v-if="treasuryData && treasuryData.length"
    >
      <b-button
        title="Exporta dades"
        class="zview-button"
        :type="'is-disabled'"
        icon-left="file-excel"
      />
    </download-excel>

    <card-component title="MOVIMENTS BANCARIS" class="ztile is-child mt-2">
      <section class="section">
        <b-table
          :loading="isLoading"
          :paginated="false"
          :striped="false"
          :data="treasuryData"
          :row-class="
            (row, index) =>
              (row.subtotal < 0 && 'has-text-danger has-text-bold') ||
              (row.type == 'Avui' && 'has-text-info')
          "
        >
          <b-table-column label="Data" field="datex" v-slot="props">
            {{ props.row.datex }}
            <b-icon
              v-if="props.row.date_error"
              class="has-text-danger"
              icon="alert-circle"
              title="No hi ha data"
              size="is-small"
            >
            </b-icon>
          </b-table-column>
          <b-table-column label="Import" field="total_amount" v-slot="props">
            {{ formatPrice(props.row.total_amount) }} €
          </b-table-column>
          <b-table-column label="Saldo" field="subtotal" v-slot="props">
            {{ formatPrice(props.row.subtotal) }} €
          </b-table-column>
          <b-table-column label="Moviment" field="type" v-slot="props">
            <span
              :class="props.row.paid ? 'has-text-success' : 'zhas-text-success'"
            >
              {{ props.row.type }}
            </span>
          </b-table-column>
          <b-table-column label="Concepte" field="concept" v-slot="props">
            <router-link v-if="props.row.to" :to="props.row.to">
              <span class="project-name has-text-info">
                {{ props.row.concept }}
              </span>
            </router-link>
            <span v-else>{{ props.row.concept }}</span>
          </b-table-column>
          <b-table-column label="Projecte" field="project_name" v-slot="props">
            <router-link
              :to="{
                name: 'project.edit',
                params: { id: props.row.project_id },
              }"
            >
              <span class="project-name has-text-info">
                {{ props.row.project_name }}
              </span>
            </router-link>
          </b-table-column>
          <b-table-column label="Contacte" field="contact" v-slot="props">
            {{ props.row.contact }}
          </b-table-column>
          <b-table-column label="Accions" v-slot="props">
            <button
              v-if="props.row.expenseId"
              class="button is-small is-danger"
              type="button"
              @click.prevent="trashModal(props.row)"
              title="Marcar com a pagat"
            >
              <b-icon icon="cash-multiple" size="is-small" />
            </button>
            <button
              v-if="props.row.incomeId"
              class="button is-small is-danger"
              type="button"
              @click.prevent="trashModal(props.row)"
              title="Marcar com a pagat"
            >
              <b-icon icon="cash-multiple" size="is-small" />
            </button>
          </b-table-column>
        </b-table>
      </section>
    </card-component>
  </div>
</template>

<script>
// import ModalBox from '@/components/ModalBox'
import service from "@/service/index";
import moment from "moment";
import sortBy from "lodash/sortBy";
import _ from "lodash";
import configPivot from "@/service/configStatsTreasury";
import ModalBoxInvoicing from "./ModalBoxInvoicing.vue";
import CardComponent from "./CardComponent.vue";
import { mapState } from "vuex";
import MoneyFormat from "vue-money-format";

export default {
  name: "Tresoreria",
  components: {
    ModalBoxInvoicing,
    CardComponent,
    MoneyFormat,
  },
  props: {
    titleStack: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      isLoading: false,
      years: [],
      projects: [],
      treasury: [],
      treasuryData: [],
      emitted: [],
      received: [],
      tickets: [],
      diets: [],
      contacts: [],
      emittedGrants: [],
      receivedGrants: [],
      projectIncomes: [],
      projectExpenses: [],
      receivedIncomes: [],
      receivedExpenses: [],
      payrolls: [],
      isModalActive: false,
      trashObject: null,
      pivotData: [],
      vat: { paid: 0, received: 0 },
      me: null,
      payingVat: false
    };
  },
  async mounted() {
    this.getData();
  },
  computed: {
    monthlySummary() {
      const treasuryData = this.treasuryData
        .filter((t) => t.datef >= moment().format("YYYYMMDD"))
        .map((t) => {
          return {
            ...t,
            year: moment(t.datef, "YYYYMMDD").format("YYYY"),
            month: moment(t.datef, "YYYYMMDD").format("MM"),
            ym: moment(t.datef, "YYYYMMDD").format("YYYYMM"),
          };
        });
      return treasuryData;
    },
    monthlySummaryTotal() {
      const ans = _(this.monthlySummary)
        .groupBy("ym")
        .map((ym, id) => ({
          ym: id,
          year: !isNaN(id) ? id.substring(0, 4) : "2099",
          month: !isNaN(id) ? id.substring(4, 6) : "99",
          valid: !isNaN(id),
          maxYm: _.maxBy(this.monthlySummary, (e) => (!isNaN(e.ym) ? e.ym : ""))
            .ym,
          total_amount: _.sumBy(ym, "total_amount"),
          total_incomes: _.sumBy(ym, (e) =>
            e.total_amount > 0 ? e.total_amount : 0
          ),
          total_expenses: _.sumBy(ym, (e) =>
            e.total_amount < 0 ? e.total_amount : 0
          ),
          subtotal: this.todaySubTotal,
        }))
        .value();

      const ansWithSubtotal = [];
      var subtotal = this.todaySubTotal;
      for (var i = 0; i < ans.length; i++) {
        subtotal = subtotal + ans[i].total_amount;
        ans[i]["subtotal"] = subtotal;
        ansWithSubtotal.push(ans[i]);
        if (ans[i].month === "12") {
          const y = ans[i].year;
          const yearValues = ansWithSubtotal.filter((a) => a.year === y);
          const yearSummary = {
            ym: `${y}00`,
            year: y,
            month: "00",
            valid: true,
            maxYm: ans[i].maxYm,
            total_amount: _.sumBy(yearValues, "total_amount"),
            total_incomes: _.sumBy(yearValues, "total_incomes"),
            total_expenses: _.sumBy(yearValues, "total_expenses"),
            subtotal: ans[i].subtotal,
          };
          ansWithSubtotal.push(yearSummary);
        }
      }

      return ansWithSubtotal;
    },
    todaySubTotal() {
      const today = this.treasuryData.find((t) => t.type === "Avui");
      return today ? today.subtotal : 0;
    },
  },
  methods: {
    async getData() {
      this.isLoading = true;
      this.treasury = [];
      this.treasuryData = [];
      const treasuries = (
        await service({ requiresAuth: true }).get("treasuries?_limit=-1")
      ).data;
      this.emitted = (
        await service({ requiresAuth: true }).get("emitted-invoices?_limit=-1")
      ).data;
      this.received = (
        await service({ requiresAuth: true }).get("received-invoices?_limit=-1")
      ).data;
      this.tickets = (
        await service({ requiresAuth: true }).get("tickets?_limit=-1")
      ).data;
      this.diets = (
        await service({ requiresAuth: true }).get("diets?_limit=-1")
      ).data;
      this.emittedGrants = (
        await service({ requiresAuth: true }).get("emitted-grants?_limit=-1")
      ).data;
      this.receivedGrants = (
        await service({ requiresAuth: true }).get("emitted-grants?_limit=-1")
      ).data;
      this.receivedIncomes = (
        await service({ requiresAuth: true }).get("received-incomes?_limit=-1")
      ).data;
      this.receivedExpenses = (
        await service({ requiresAuth: true }).get("received-expenses?_limit=-1")
      ).data;
      this.contacts = (
        await service({ requiresAuth: true }).get(
          "contacts?_limit=-1&_sort=name:ASC"
        )
      ).data;
      this.payrolls = (
        await service({ requiresAuth: true }).get("payrolls?_limit=-1")
      ).data;
      this.me = (await service({ requiresAuth: true }).get("me")).data;

      service({ requiresAuth: true })
        .get("projects?_limit=-1")
        .then((r) => {
          this.projects = r.data;
          this.projects.forEach((p) => {
            p.expenses.forEach((e) => {
              if (!e.paid) {
                const expense = {
                  project_name: p.name,
                  project_id: p.id,
                  type: "Despesa esperada",
                  concept: e.concept,
                  total_amount: e.total_amount
                    ? -1 * Math.abs(e.total_amount)
                    : 0,
                  date: moment(e.date, "YYYY-MM-DD") || moment(),
                  date_error: e.date === null,
                  paid: false,
                  contact:
                    e.provider && e.provider.name ? e.provider.name : "-",
                };
                this.treasury.push(expense);
              }
              if (e.invoice && e.invoice.id) {
                this.projectExpenses.push({
                  type: "invoice",
                  id: e.invoice.id,
                  code: e.invoice.code,
                });
              }
              if (e.grant && e.grant.id) {
                this.projectExpenses.push({
                  type: "grant",
                  id: e.grant.id,
                  code: e.grant.code,
                });
              }
              if (e.ticket && e.ticket.id) {
                this.projectExpenses.push({
                  type: "ticket",
                  id: e.ticket.id,
                  code: e.ticket.code,
                });
              }
              if (e.diet && e.diet.id) {
                this.projectExpenses.push({
                  type: "diet",
                  id: e.diet.id,
                  code: e.diet.code,
                });
              }
              if (e.expense && e.expense.id) {
                this.projectExpenses.push({
                  type: "expense",
                  id: e.expense.id,
                  code: e.expense.code,
                });
              }
            });
            p.incomes.forEach((i) => {
              if (!i.paid) {
                const income = {
                  project_name: p.name,
                  project_id: p.id,
                  type: "Ingrés esperat",
                  concept: i.concept,
                  total_amount: i.total_amount ? Math.abs(i.total_amount) : 0,
                  date: moment(i.date, "YYYY-MM-DD") || moment(),
                  date_error: i.date === null,
                  paid: false,
                  contact: i.client && i.client.name ? i.client.name : "-",
                };
                this.treasury.push(income);
              }
              if (i.invoice && i.invoice.id) {
                this.projectIncomes.push({
                  type: "invoice",
                  id: i.invoice.id,
                  code: i.invoice.code,
                });
              }
              if (i.grant && i.grant.id) {
                this.projectIncomes.push({
                  type: "grant",
                  id: i.grant.id,
                  code: i.grant.code,
                });
              }
              if (i.income && i.income.id) {
                this.projectIncomes.push({
                  type: "income",
                  id: i.income.id,
                  code: i.income.code,
                });
              }
            });

            p.phases.forEach((ph) => {
              ph.expenses.forEach((e, i) => {
                // console.log('expenses', e)
                if (!e.paid) {
                  const expense = {
                    expenseId: e.id,
                    project_name: p.name,
                    project_id: p.id,
                    type: "Despesa esperada",
                    concept: e.concept,
                    total_amount: e.total_amount
                      ? -1 * Math.abs(e.total_amount)
                      : 0,
                    date: moment(e.date, "YYYY-MM-DD") || moment(),
                    date_error: e.date === null,
                    paid: false,
                    contact:
                      e.provider && e.provider.name ? e.provider.name : "-",
                  };
                  this.treasury.push(expense);
                }
                if (e.invoice && e.invoice.id) {
                  this.projectExpenses.push({
                    type: "invoice",
                    id: e.invoice.id,
                    code: e.invoice.code,
                  });
                }
                if (e.grant && e.grant.id) {
                  this.projectExpenses.push({
                    type: "grant",
                    id: e.grant.id,
                    code: e.grant.code,
                  });
                }
                if (e.ticket && e.ticket.id) {
                  this.projectExpenses.push({
                    type: "ticket",
                    id: e.ticket.id,
                    code: e.ticket.code,
                  });
                }
                if (e.diet && e.diet.id) {
                  this.projectExpenses.push({
                    type: "diet",
                    id: e.diet.id,
                    code: e.diet.code,
                  });
                }
                if (e.expense && e.expense.id) {
                  this.projectExpenses.push({
                    type: "expense",
                    id: e.expense.id,
                    code: e.expense.code,
                  });
                }
              });
              ph.subphases.forEach((i) => {
                if (!i.paid) {
                  const income = {
                    incomeId: i.id,
                    project_name: p.name,
                    project_id: p.id,
                    type: "Ingrés esperat",
                    concept: i.concept,
                    total_amount: i.total_amount ? Math.abs(i.total_amount) : 0,
                    date: moment(i.date, "YYYY-MM-DD") || moment(),
                    date_error: i.date === null,
                    paid: false,
                    contact: i.client && i.client.name ? i.client.name : "-",
                  };
                  this.treasury.push(income);
                }
                if (i.invoice && i.invoice.id) {
                  this.projectIncomes.push({
                    type: "invoice",
                    id: i.invoice.id,
                    code: i.invoice.code,
                  });
                }
                if (i.grant && i.grant.id) {
                  this.projectIncomes.push({
                    type: "grant",
                    id: i.grant.id,
                    code: i.grant.code,
                  });
                }
                if (i.income && i.income.id) {
                  this.projectIncomes.push({
                    type: "income",
                    id: i.income.id,
                    code: i.income.code,
                  });
                }
              });
            });
          });
          // console.log('treasuries', treasuries)
          treasuries.forEach((e) => {
            const expense = {
              project_name: "-",
              project_id: 0,
              type: e.comment === "IVA Saldat" ? e.comment : "Entrada manual",
              concept: e.comment,
              total_amount: e.total,
              date: moment(e.date, "YYYY-MM-DD") || moment(),
              date_error: e.date === null,
              paid: true,
              contact: "-",
            };
            this.treasury.push(expense);
          });
          // today
          const today = {
            project_name: "-",
            project_id: 0,
            type: "Avui",
            concept: "-",
            total_amount: 0,
            date: moment(),
            date_error: false,
            paid: null,
            contact: "-",
          };
          this.treasury.push(today);

          // vat
          const vats = [];
          // emitted
          this.emitted.forEach((i) => {
            const date = i.paid_date
              ? moment(i.paid_date, "YYYY-MM-DD")
              : moment.max([
                  i.paybefore ? moment(i.paybefore, "YYYY-MM-DD") : moment(),
                  i.emitted ? moment(i.emitted, "YYYY-MM-DD") : moment(),
                  moment(),
                ]);
            const income = {
              project_name:
                i.project && i.project.name
                  ? i.project.name
                  : i.projects &&
                    i.projects.length &&
                    i.projects[0] &&
                    i.projects[0].name
                  ? i.projects[0].name
                  : "",
              project_id: i.project
                ? i.project.id
                : i.projects &&
                  i.projects.length &&
                  i.projects[0] &&
                  i.projects[0].id
                ? i.projects[0].id
                : 0,
              type: i.paid ? "Factura cobrada" : "Factura emesa",
              concept: i.code,
              total_amount: i.total ? Math.abs(i.total) : 0,
              date: date,
              date_error: (i.paid_date || i.paybefore || i.emitted) === null,
              real: true,
              pdf: i.pdf,
              paid: i.paid,
              contact: i.contact && i.contact.name ? i.contact.name : "?",
              to: `/document/${i.id}/emitted-invoices`,
            };
            this.treasury.push(income);
            if (i.total_vat) {
              // const vat = {
              //   project_name:
              //     i.project && i.project.name
              //       ? i.project.name
              //       : i.projects &&
              //         i.projects.length &&
              //         i.projects[0] &&
              //         i.projects[0].name
              //       ? i.projects[0].name
              //       : "",
              //   project_id: i.project
              //     ? i.project.id
              //     : i.projects &&
              //       i.projects.length &&
              //       i.projects[0] &&
              //       i.projects[0].id
              //     ? i.projects[0].id
              //     : 0,
              //   type: "IVA Repercutit Factura",
              //   concept: i.code,
              //   total_amount: -1 * Math.abs(i.total_vat),
              //   date: moment(i.emitted, "YYYY-MM-DD")
              //     .endOf("quarter")
              //     .add(20, "day"),
              //   date_error: i.emitted === null,
              //   real: true,
              //   pdf: i.pdf,
              //   paid:
              //     moment(i.emitted, "YYYY-MM-DD")
              //       .endOf("quarter")
              //       .add(20, "day")
              //       .format("YYYY-MM-DD") < moment().format("YYYY-MM-DD"),
              //   contact: i.contact && i.contact.name ? i.contact.name : "?",
              //   to: `/document/${i.id}/emitted-invoices`,
              // };
              // this.treasury.push(vat);
              if (!i.vat_paid_date) {
                this.vat.received += i.total_vat;
              }
            }
          });
          this.receivedIncomes.forEach((i) => {
            const date = i.paid_date
              ? moment(i.paid_date, "YYYY-MM-DD")
              : moment.max([
                  i.paybefore ? moment(i.paybefore, "YYYY-MM-DD") : moment(),
                  i.emitted ? moment(i.emitted, "YYYY-MM-DD") : moment(),
                  moment(),
                ]);
            const income = {
              project_name:
                i.project && i.project.name
                  ? i.project.name
                  : i.projects &&
                    i.projects.length &&
                    i.projects[0] &&
                    i.projects[0].name
                  ? i.projects[0].name
                  : "",
              project_id: i.project
                ? i.project.id
                : i.projects &&
                  i.projects.length &&
                  i.projects[0] &&
                  i.projects[0].id
                ? i.projects[0].id
                : 0,
              type: `${i.paid ? "Ingrés cobrat" : "Ingrés emès"} (${
                i.document_type.name
              })`,
              concept: i.code,
              total_amount: i.total ? Math.abs(i.total) : 0,
              date: date,
              date_error: (i.paid_date || i.paybefore || i.emitted) === null,
              real: true,
              pdf: i.pdf,
              paid: i.paid,
              contact: i.contact && i.contact.name ? i.contact.name : "?",
              to: `/document/${i.id}/received-incomes`,
            };
            this.treasury.push(income);
            if (i.total_vat) {
              // const vat = {
              //   project_name:
              //     i.project && i.project.name
              //       ? i.project.name
              //       : i.projects &&
              //         i.projects.length &&
              //         i.projects[0] &&
              //         i.projects[0].name
              //       ? i.projects[0].name
              //       : "",
              //   project_id: i.project
              //     ? i.project.id
              //     : i.projects &&
              //       i.projects.length &&
              //       i.projects[0] &&
              //       i.projects[0].id
              //     ? i.projects[0].id
              //     : 0,
              //   type: "IVA Repercutit Ingrés",
              //   concept: i.code,
              //   total_amount: -1 * Math.abs(i.total_vat),
              //   date: moment(i.emitted, "YYYY-MM-DD")
              //     .endOf("quarter")
              //     .add(20, "day"),
              //   date_error: i.emitted === null,
              //   real: true,
              //   pdf: i.pdf,
              //   paid:
              //     moment(i.emitted, "YYYY-MM-DD")
              //       .endOf("quarter")
              //       .add(20, "day")
              //       .format("YYYY-MM-DD") < moment().format("YYYY-MM-DD"),
              //   contact: i.contact && i.contact.name ? i.contact.name : "?",
              //   to: `/document/${i.id}/received-incomes`,
              // };
              // this.treasury.push(vat);
              if (!i.vat_paid_date) {
                this.vat.received += i.total_vat;
              }
            }
          });
          // received
          this.received.forEach((e) => {
            const date = e.paid_date
              ? moment(e.paid_date, "YYYY-MM-DD")
              : moment.max([
                  e.paybefore ? moment(e.paybefore, "YYYY-MM-DD") : moment(),
                  e.emitted ? moment(e.emitted, "YYYY-MM-DD") : moment(),
                  moment(),
                ]);
            const expense = {
              project_name:
                e.project && e.project.name
                  ? e.project.name
                  : e.projects &&
                    e.projects.length &&
                    e.projects[0] &&
                    e.projects[0].name
                  ? e.projects[0].name
                  : "",
              project_id: e.project
                ? e.project.id
                : e.projects &&
                  e.projects.length &&
                  e.projects[0] &&
                  e.projects[0].id
                ? e.projects[0].id
                : 0,
              type: e.paid ? "Factura pagada" : "Factura rebuda",
              concept: e.code,
              total_amount: e.total ? -1 * Math.abs(e.total) : 0,
              date: date,
              date_error: false,
              paid: e.paid,
              real: true,
              pdf: e.pdf,
              contact: e.contact && e.contact.name ? e.contact.name : "-",
              to: `/document/${e.id}/received-invoices`,
            };
            this.treasury.push(expense);
            if (e.total_irpf) {
              const expense2 = {
                project_name:
                  e.project && e.project.name
                    ? e.project.name
                    : e.projects &&
                      e.projects.length &&
                      e.projects[0] &&
                      e.projects[0].name
                    ? e.projects[0].name
                    : "",
                project_id: e.project
                  ? e.project.id
                  : e.projects &&
                    e.projects.length &&
                    e.projects[0] &&
                    e.projects[0].id
                  ? e.projects[0].id
                  : 0,
                type: "IRPF Factura",
                concept: e.code,
                total_amount: -1 * Math.abs(e.total_irpf),
                date: moment(e.emitted, "YYYY-MM-DD")
                  .endOf("quarter")
                  .add(20, "day"),
                date_error: e.emitted === null,
                paid:
                  moment(e.emitted, "YYYY-MM-DD")
                    .endOf("quarter")
                    .add(20, "day")
                    .format("YYYY-MM-DD") < moment().format("YYYY-MM-DD"),
                contact: e.contact && e.contact.name ? e.contact.name : "-",
                to: `/document/${e.id}/received-invoices`,
              };
              this.treasury.push(expense2);
            }
            if (e.total_vat) {
              // const vat = {
              //   project_name:
              //     e.project && e.project.name
              //       ? e.project.name
              //       : e.projects &&
              //         e.projects.length &&
              //         e.projects[0] &&
              //         e.projects[0].name
              //       ? e.projects[0].name
              //       : "",
              //   project_id: e.project
              //     ? e.project.id
              //     : e.projects &&
              //       e.projects.length &&
              //       e.projects[0] &&
              //       e.projects[0].id
              //     ? e.projects[0].id
              //     : 0,
              //   type: "IVA Soportat Factura",
              //   concept: e.code,
              //   total_amount: Math.abs(e.total_vat),
              //   date: moment(e.emitted, "YYYY-MM-DD")
              //     .endOf("quarter")
              //     .add(20, "day"),
              //   date_error: e.emitted === null,
              //   real: true,
              //   pdf: e.pdf,
              //   paid:
              //     moment(e.emitted, "YYYY-MM-DD")
              //       .endOf("quarter")
              //       .add(20, "day")
              //       .format("YYYY-MM-DD") < moment().format("YYYY-MM-DD"),
              //   contact: e.contact && e.contact.name ? e.contact.name : "?",
              //   to: `/document/${e.id}/received-invoices`,
              // };
              // this.treasury.push(vat);
              if (!e.vat_paid_date) {
                this.vat.paid += e.total_vat;
              }
            }
          });
          this.receivedExpenses.forEach((e) => {
            const date = e.paid_date
              ? moment(e.paid_date, "YYYY-MM-DD")
              : moment.max([
                  e.paybefore ? moment(e.paybefore, "YYYY-MM-DD") : moment(),
                  e.emitted ? moment(e.emitted, "YYYY-MM-DD") : moment(),
                  moment(),
                ]);
            const expense = {
              project_name:
                e.project && e.project.name
                  ? e.project.name
                  : e.projects &&
                    e.projects.length &&
                    e.projects[0] &&
                    e.projects[0].name
                  ? e.projects[0].name
                  : "",
              project_id: e.project
                ? e.project.id
                : e.projects &&
                  e.projects.length &&
                  e.projects[0] &&
                  e.projects[0].id
                ? e.projects[0].id
                : 0,
              type: `${e.paid ? "Despesa pagada" : "Despesa rebuda"} (${
                e.document_type.name
              })`,
              concept: e.code,
              total_amount: e.total ? -1 * Math.abs(e.total) : 0,
              date: date,
              date_error: false,
              paid: e.paid,
              real: true,
              pdf: e.pdf,
              contact: e.contact && e.contact.name ? e.contact.name : "-",
              to: `/document/${e.id}/received-expenses`,
            };
            this.treasury.push(expense);
            if (e.total_irpf) {
              const expense2 = {
                project_name:
                  e.project && e.project.name
                    ? e.project.name
                    : e.projects &&
                      e.projects.length &&
                      e.projects[0] &&
                      e.projects[0].name
                    ? e.projects[0].name
                    : "",
                project_id: e.project
                  ? e.project.id
                  : e.projects &&
                    e.projects.length &&
                    e.projects[0] &&
                    e.projects[0].id
                  ? e.projects[0].id
                  : 0,
                type: "IRPF Factura",
                concept: e.code,
                total_amount: -1 * Math.abs(e.total_irpf),
                date: moment(e.emitted, "YYYY-MM-DD")
                  .endOf("quarter")
                  .add(20, "day"),
                date_error: e.emitted === null,
                paid: false,
                contact: e.contact && e.contact.name ? e.contact.name : "-",
                to: `/document/${e.id}/received-expenses`,
              };
              this.treasury.push(expense2);
            }
            if (e.total_vat) {
              // const vat = {
              //   project_name:
              //     e.project && e.project.name
              //       ? e.project.name
              //       : e.projects &&
              //         e.projects.length &&
              //         e.projects[0] &&
              //         e.projects[0].name
              //       ? e.projects[0].name
              //       : "",
              //   project_id: e.project
              //     ? e.project.id
              //     : e.projects &&
              //       e.projects.length &&
              //       e.projects[0] &&
              //       e.projects[0].id
              //     ? e.projects[0].id
              //     : 0,
              //   type: "IVA Soportat Factura",
              //   concept: e.code,
              //   total_amount: Math.abs(e.total_vat),
              //   date: moment(e.emitted, "YYYY-MM-DD")
              //     .endOf("quarter")
              //     .add(20, "day"),
              //   date_error: e.emitted === null,
              //   real: true,
              //   pdf: e.pdf,
              //   paid: e.paid,
              //   contact: e.contact && e.contact.name ? e.contact.name : "?",
              //   to: `/document/${e.id}/received-invoices`,
              // };
              // this.treasury.push(vat);
              if (!e.vat_paid_date) {
                this.vat.received += e.total_vat;
              }
            }
          });
          this.diets.forEach((e) => {
            const date = e.paid_date
              ? moment(e.paid_date, "YYYY-MM-DD")
              : moment.max([
                  e.paybefore ? moment(e.paybefore, "YYYY-MM-DD") : moment(),
                  e.emitted ? moment(e.emitted, "YYYY-MM-DD") : moment(),
                  moment(),
                ]);
            const expense = {
              project_name:
                e.project && e.project.name
                  ? e.project.name
                  : e.projects &&
                    e.projects.length &&
                    e.projects[0] &&
                    e.projects[0].name
                  ? e.projects[0].name
                  : "",
              project_id: e.project
                ? e.project.id
                : e.projects &&
                  e.projects.length &&
                  e.projects[0] &&
                  e.projects[0].id
                ? e.projects[0].id
                : 0,
              type: "Dieta",
              concept: e.code,
              total_amount: e.total ? -1 * Math.abs(e.total) : 0,
              date: date,
              date_error: (e.paid_date || e.paybefore || e.emitted) === null,
              paid: e.paid,
              contact: e.contact && e.contact.name ? e.contact.name : "-",
            };
            this.treasury.push(expense);
          });
          this.tickets.forEach((e) => {
            const date = e.paid_date
              ? moment(e.paid_date, "YYYY-MM-DD")
              : moment.max([
                  e.paybefore ? moment(e.paybefore, "YYYY-MM-DD") : moment(),
                  e.emitted ? moment(e.emitted, "YYYY-MM-DD") : moment(),
                  moment(),
                ]);
            const expense = {
              project_name:
                e.project && e.project.name
                  ? e.project.name
                  : e.projects &&
                    e.projects.length &&
                    e.projects[0] &&
                    e.projects[0].name
                  ? e.projects[0].name
                  : "",
              project_id: e.project
                ? e.project.id
                : e.projects &&
                  e.projects.length &&
                  e.projects[0] &&
                  e.projects[0].id
                ? e.projects[0].id
                : 0,
              type: "Ticket",
              concept: e.code,
              total_amount: e.total ? -1 * Math.abs(e.total) : 0,
              date: date,
              date_error: (e.paid_date || e.emitted) === null,
              paid: e.paid,
              contact: e.provider && e.provider.name ? e.provider.name : "-",
            };
            this.treasury.push(expense);
          });

          this.payrolls.forEach((e) => {
            const date = e.paid_date
              ? moment(e.paid_date, "YYYY-MM-DD")
              : moment.max([
                  e.emitted ? moment(e.emitted, "YYYY-MM-DD") : moment(),
                  moment(),
                ]);
            const expense = {
              project_name: "",
              project_id: 0,
              type: e.paid ? "Nòmina pagada" : "Nòmina esperada",
              concept: `Nòmina ${e.year.year}-${this.zeroPad(e.month.month, 2)}-${e.users_permissions_user.username}`,
              total_amount: e.net_base ? -1 * Math.abs(e.net_base) : 0,
              date: moment(e.net_date, "YYYY-MM-DD"),
              date_error: (e.paid_date || e.emitted) === null,
              paid: e.paid,
              contact:
                e.users_permissions_user && e.users_permissions_user.username
                  ? e.users_permissions_user.username
                  : "",
              to: `/document/${e.id}/payrolls`,
            };
            this.treasury.push(expense);

            if (e.irpf_base || e.other_base) {
              const expense2 = {
                project_name: "",
                project_id: 0,
                type: "IRPF Nòmina",
                concept: `Nòmina ${e.year.year}-${this.zeroPad(e.month.month, 2)}-${e.users_permissions_user.username}`,
                total_amount:
                  e.irpf_base || e.other_base
                    ? -1 * Math.abs(e.irpf_base + e.other_base)
                    : 0,
                date: moment(e.irpf_date, "YYYY-MM-DD"),
                date_error: e.irpf_date === null,
                paid: e.paid,
                contact:
                  e.users_permissions_user && e.users_permissions_user.username
                    ? e.users_permissions_user.username
                    : "",
                to: `/document/${e.id}/payrolls`,
              };
              this.treasury.push(expense2);
            }

            if (e.ss_base) {
              const expense3 = {
                project_name: "",
                project_id: 0,
                type: e.paid ? "SS pagat" : "SS esperat",
                concept: `Nòmina ${e.year.year}-${this.zeroPad(e.month.month, 2)}-${e.users_permissions_user.username}`,
                total_amount: e.ss_base ? -1 * Math.abs(e.ss_base) : 0,
                date: moment(e.ss_date, "YYYY-MM-DD"),
                date_error: e.ss_date === null,
                paid: e.paid,
                contact:
                  e.users_permissions_user && e.users_permissions_user.username
                    ? e.users_permissions_user.username
                    : "",
                to: `/document/${e.id}/payrolls`,
              };
              this.treasury.push(expense3);
            }
          });

          // sort and show

          this.treasury = this.treasury.map((t) => {
            return { ...t, datef: t.date.format("YYYYMMDD") };
          });

          // console.log('this.treasury 2',this.treasury)

          const treasuryData = sortBy(this.treasury, "datef");
          let subtotal = 0;
          for (let i = 0; i < treasuryData.length; i++) {
            const t = treasuryData[i];
            subtotal += t.total_amount;
            this.treasuryData.push({
              ...t,
              datex: moment(treasuryData[i].datef, "YYYYMMDD").format(
                "DD-MM-YYYY"
              ),
              subtotal,
            });
          }

          this.pivotData = Object.freeze(this.monthlySummaryTotal);
          // configPivot.dataSource.data = this.pivotData;
          // window.jQuery("#treasury-pivot").empty();
          // window.jQuery("#treasury-pivot").kendoPivotGrid(configPivot);
          // console.log('this.treasury 3',this.treasuryData)
        });

      this.isLoading = false;
    },
    formatPrice(value) {
      const val = (value / 1).toFixed(2).replace(".", ",");
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    formatDate(value) {
      return moment(value, "YYYY-MM-DD").format("DD-MM-YYYY");
    },
    trashModal(trashObject) {
      // console.log('trashObject', trashObject)

      const invoicingObject = {
        origin: "treasury",
        ...trashObject,
        type: trashObject.expenseId ? "expenses" : "incomes",
        emitted_invoices: this.emitted.filter(
          (i) => i.project && i.project.id === trashObject.project_id
        ),
        received_invoices: this.received.filter(
          (i) => i.project && i.project.id === trashObject.project_id
        ),
        diets: this.diets.filter(
          (i) => i.project && i.project.id === trashObject.project_id
        ),
        tickets: this.tickets.filter(
          (i) => i.project && i.project.id === trashObject.project_id
        ),
        grants: trashObject.expenseId
          ? this.receivedGrants.filter(
              (i) => i.project && i.project.id === trashObject.project_id
            )
          : this.emittedGrants.filter(
              (i) => i.project && i.project.id === trashObject.project_id
            ),
        contacts: this.contacts,
      };

      // console.log("invoicingObject", invoicingObject);

      // this.invoicingObject = {
      //   type,
      //   phase,
      //   subphase,
      //   i,
      //   j,
      //   emitted_invoices: this.form.emitted_invoices,
      //   received_invoices: this.form.received_invoices,
      //   diets: this.form.diets,
      //   tickets: this.form.tickets
      // }
      this.trashObject = invoicingObject;
      this.isModalActive = true;
    },
    async modalSubmit(invoicing) {
      this.isModalActive = false;
      if (this.trashObject.expenseId) {
        await service({ requiresAuth: true }).put(
          `projects/${this.trashObject.project_id}/pay-expense/${this.trashObject.expenseId}`,
          invoicing
        );
      } else if (this.trashObject.incomeId) {
        await service({ requiresAuth: true }).put(
          `projects/${this.trashObject.project_id}/pay-income/${this.trashObject.incomeId}`,
          invoicing
        );
      }
      // await service({ requiresAuth: true }).delete(`projects/${this.trashObject.id}`)
      // this.projectsData = this.projectsData.filter(p => p.id !== this.trashObject.id)
      this.$buefy.snackbar.open({
        message: "Fet",
        queue: false,
      });
      this.getData();
    },
    modalCancel() {
      this.isModalActive = false;
    },
    async payVat() {
      this.payingVat = true
      await service({ requiresAuth: true }).post(
          `emitted-invoices/pay-vat`
      );
      this.payingVat = false
      window.location.reload()
    },
    zeroPad(num, places) {
      return String(num).padStart(places, '0')
    } 
  },
};
</script>
<style>
.treasury-table.b-table .table th,
.treasury-table.b-table td {
  min-width: 150px;
}
</style>