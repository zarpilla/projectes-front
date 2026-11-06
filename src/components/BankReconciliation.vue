<template>
  <!-- «Tresoreria › Conciliació» (issues/413): bank statements uploaded as
       Norma 43 files, their movements matched with the lines of Tresoreria -->
  <div class="recon-page">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false" />

    <div class="segmented recon-tabs" role="tablist" aria-label="Apartat">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        :class="{ 'is-on': tab === t.id }"
        :aria-selected="tab === t.id ? 'true' : 'false'"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <template v-if="tab === 'movements'">
      <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
        <label class="filter-select">
          <span>Compte</span>
          <b-select v-model="bankAccount" aria-label="Compte">
            <option :value="null">Tots</option>
            <option v-for="a in bankAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
          </b-select>
        </label>
        <div class="segmented" role="tablist" aria-label="Estat">
          <button
            v-for="s in statusFilters"
            :key="s.id"
            type="button"
            role="tab"
            :class="{ 'is-on': status === s.id }"
            :aria-selected="status === s.id ? 'true' : 'false'"
            @click="status = s.id"
          >
            {{ s.label }}
          </button>
        </div>
        <div class="recon-actions">
          <b-upload v-model="file" accept=".n43,.N43,.txt,.TXT,.aeb,.q43,.csb,.dat" @update:model-value="upload">
            <span class="button is-primary is-small">
              <b-icon icon="upload" size="is-small" />
              <span>Puja un extracte (Norma 43)</span>
            </span>
          </b-upload>
          <b-button size="is-small" icon-left="auto-fix" @click="runAuto">Concilia automàticament</b-button>
        </div>
      </form>
      <p class="recon-help">
        Descarregueu l'extracte del banc en format <b>Norma 43</b> (també dit «Cuaderno 43» o «CSB43») des de la banca en línia i pugeu-lo aquí.
        Els moviments que ja s'havien pujat no es dupliquen. Els que coincideixen clarament amb una línia de Tresoreria es concilien sols: els documents
        pendents queden cobrats o pagats amb la data del banc. El saldo final de l'extracte passa a ser el saldo real del compte.
      </p>

      <div class="doc-kpis">
        <div class="doc-kpi">
          <span>Pendents</span>
          <b>{{ kpis.pending }}</b>
          <small>moviments per conciliar</small>
        </div>
        <div class="doc-kpi">
          <span>Entrades pendents</span>
          <b>{{ money(kpis.in) }}</b>
          <small>&nbsp;</small>
        </div>
        <div class="doc-kpi">
          <span>Sortides pendents</span>
          <b>{{ money(kpis.out) }}</b>
          <small>&nbsp;</small>
        </div>
        <div class="doc-kpi">
          <span>Amb proposta</span>
          <b>{{ kpis.suggested }}</b>
          <small>pendents amb alguna coincidència</small>
        </div>
      </div>

      <section class="a-box list-box">
        <header class="box-head">
          <h2>Moviments del banc</h2>
          <span class="box-hint">Obriu un moviment per triar-ne les línies, crear-ne una operació o una despesa, o desfer-lo</span>
        </header>
        <b-table :data="movements" :paginated="movements.length > 50" :per-page="50" :striped="false" class="recon-table" @click="open">
          <b-table-column label="Data" field="date" sortable v-slot="props">
            {{ date(props.row.date) }}
          </b-table-column>
          <b-table-column label="Compte" field="bank_account.name" sortable v-slot="props">
            {{ props.row.bank_account ? props.row.bank_account.name : "—" }}
          </b-table-column>
          <b-table-column label="Concepte" field="concept" searchable v-slot="props">
            <span class="recon-concept">{{ props.row.concept || "—" }}</span>
            <small v-if="props.row.reference" class="has-text-muted"> · {{ props.row.reference }}</small>
          </b-table-column>
          <b-table-column label="Import" field="amount" numeric sortable v-slot="props">
            <b :class="props.row.amount < 0 ? 'has-text-danger' : 'has-text-success'">{{ money(props.row.amount) }}</b>
          </b-table-column>
          <b-table-column label="Conciliació" v-slot="props">
            <template v-if="props.row.status === 'pending'">
              <span v-if="props.row.suggestions && props.row.suggestions.length" class="recon-suggest">
                <span class="tag is-light" :class="props.row.suggestions[0].auto ? 'is-success' : 'is-info'">{{ suggestionLabel(props.row.suggestions[0]) }}</span>
                {{ linesSummary(props.row.suggestions[0].lines) }}
              </span>
              <span v-else-if="props.row.transfer_with" class="tag is-info is-light">Possible traspàs</span>
              <span v-else-if="props.row.rule_suggestion" class="tag is-info is-light">Regla «{{ props.row.rule_suggestion.name }}»</span>
              <span v-else class="has-text-muted">Sense proposta</span>
            </template>
            <template v-else>
              <span class="tag is-light" :class="props.row.status === 'matched' ? 'is-success' : ''">{{ matchLabel(props.row) }}</span>
              <small v-if="props.row.auto" class="has-text-muted"> automàtic</small>
            </template>
          </b-table-column>
          <b-table-column label="" v-slot="props">
            <b-button
              v-if="props.row.status === 'pending' && props.row.suggestions && props.row.suggestions.length && props.row.suggestions[0].kind !== 'partial'"
              size="is-small"
              type="is-primary"
              outlined
              @click.stop="acceptSuggestion(props.row, props.row.suggestions[0])"
            >
              Accepta
            </b-button>
            <b-button v-else-if="props.row.status !== 'pending'" size="is-small" outlined @click.stop="undo(props.row)">Desfés</b-button>
          </b-table-column>
          <template #empty>
            <p class="box-empty">{{ status === "pending" ? "No hi ha cap moviment pendent de conciliar." : "No hi ha moviments." }}</p>
          </template>
        </b-table>
      </section>
    </template>

    <template v-else-if="tab === 'rules'">
      <section class="a-box list-box">
        <header class="box-head">
          <h2>Regles</h2>
          <span class="box-hint">Què fer amb els moviments sense document: comissions, quotes, traspassos… S'apliquen a la conciliació automàtica, quan el moviment no coincideix amb cap línia.</span>
        </header>
        <b-table :data="rules" :striped="false" class="recon-table">
          <b-table-column label="Nom" field="name" v-slot="props">{{ props.row.name }}</b-table-column>
          <b-table-column label="Si el concepte conté" field="pattern" v-slot="props"><code>{{ props.row.pattern }}</code></b-table-column>
          <b-table-column label="Moviments" field="direction" v-slot="props">{{ label(ruleDirections, props.row.direction) }}</b-table-column>
          <b-table-column label="Compte" v-slot="props">{{ props.row.bank_account ? props.row.bank_account.name : "Tots" }}</b-table-column>
          <b-table-column label="Acció" field="action" v-slot="props">{{ label(ruleActions, props.row.action) }}</b-table-column>
          <b-table-column label="Activa" field="active" v-slot="props">
            <span class="tag is-light" :class="props.row.active !== false ? 'is-success' : ''">{{ props.row.active !== false ? "Sí" : "No" }}</span>
          </b-table-column>
          <b-table-column label="" v-slot="props">
            <b-button size="is-small" outlined @click="editRule(props.row)">Edita</b-button>
          </b-table-column>
          <template #empty>
            <p class="box-empty">Encara no hi ha cap regla.</p>
          </template>
        </b-table>
        <div class="recon-rule-add">
          <b-button size="is-small" type="is-primary" icon-left="plus" @click="editRule(null)">Afegeix una regla</b-button>
        </div>
      </section>

      <section v-if="rule" class="a-box recon-rule-form">
        <header class="box-head">
          <h2>{{ rule.id ? "Edita la regla" : "Nova regla" }}</h2>
        </header>
        <div class="recon-form">
          <b-field label="Nom"><b-input v-model="rule.name" required /></b-field>
          <b-field label="Si el concepte conté" message="Sense distingir majúscules ni accents">
            <b-input v-model="rule.pattern" required />
          </b-field>
          <b-field label="Moviments">
            <b-select v-model="rule.direction">
              <option v-for="d in ruleDirections" :key="d.id" :value="d.id">{{ d.label }}</option>
            </b-select>
          </b-field>
          <b-field label="Compte">
            <b-select v-model="rule.bank_account">
              <option :value="null">Tots</option>
              <option v-for="a in bankAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
            </b-select>
          </b-field>
          <b-field label="Acció">
            <b-select v-model="rule.action">
              <option v-for="a in ruleActions" :key="a.id" :value="a.id">{{ a.label }}</option>
            </b-select>
          </b-field>
          <template v-if="rule.action !== 'ignore'">
            <b-field label="Projecte" :message="rule.action === 'expense' ? 'Obligatori per a una despesa' : 'Opcional'">
              <b-select v-model="rule.project">
                <option :value="null">—</option>
                <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
              </b-select>
            </b-field>
          </template>
          <template v-if="rule.action === 'expense'">
            <b-field label="Proveïdora">
              <b-select v-model="rule.contact">
                <option :value="null">—</option>
                <option v-for="c in contacts" :key="c.id" :value="c.id">{{ c.name }}</option>
              </b-select>
            </b-field>
            <b-field label="Tipus de despesa">
              <b-select v-model="rule.document_type">
                <option :value="null">—</option>
                <option v-for="d in documentTypes" :key="d.id" :value="d.id">{{ d.name }}</option>
              </b-select>
            </b-field>
          </template>
          <b-field><b-switch v-model="rule.active">Activa</b-switch></b-field>
        </div>
        <div class="recon-form-actions">
          <b-button type="is-primary" size="is-small" :disabled="!ruleIsValid" @click="saveRule">Desa</b-button>
          <b-button size="is-small" @click="rule = null">Cancel·la</b-button>
          <b-button v-if="rule.id" size="is-small" type="is-danger" outlined @click="deleteRule">Esborra</b-button>
        </div>
      </section>
    </template>

    <template v-else>
      <section class="a-box list-box">
        <header class="box-head">
          <h2>Extractes pujats</h2>
          <span class="box-hint">Els últims 20</span>
        </header>
        <b-table :data="imports" :striped="false" class="recon-table">
          <b-table-column label="Pujat" v-slot="props">{{ datetime(props.row.createdAt) }}</b-table-column>
          <b-table-column label="Fitxer" v-slot="props">{{ props.row.file_name || "—" }}</b-table-column>
          <b-table-column label="Compte" v-slot="props">{{ props.row.bank_account ? props.row.bank_account.name : "—" }}</b-table-column>
          <b-table-column label="Període" v-slot="props">{{ date(props.row.date_from) }} – {{ date(props.row.date_to) }}</b-table-column>
          <b-table-column label="Nous" numeric v-slot="props">{{ props.row.movements_new }}</b-table-column>
          <b-table-column label="Ja pujats" numeric v-slot="props">{{ props.row.movements_duplicate }}</b-table-column>
          <b-table-column label="Saldo final" numeric v-slot="props">{{ money(props.row.closing_balance) }}</b-table-column>
          <template #empty>
            <p class="box-empty">Encara no s'ha pujat cap extracte.</p>
          </template>
        </b-table>
      </section>
    </template>

    <b-modal v-model="detailOpen" :width="960" scroll="keep" aria-modal :can-cancel="['escape', 'x', 'outside']">
      <div v-if="current" class="card recon-detail">
        <header class="card-header">
          <p class="card-header-title">
            {{ date(current.date) }} · {{ current.bank_account ? current.bank_account.name : "" }} ·
            <span :class="current.amount < 0 ? 'has-text-danger' : 'has-text-success'">&nbsp;{{ money(current.amount) }}</span>
          </p>
        </header>
        <div class="card-content">
          <p class="recon-detail-concept">{{ current.concept || "—" }} <small v-if="current.reference" class="has-text-muted">· {{ current.reference }}</small></p>

          <template v-if="current.status !== 'pending'">
            <p><span class="tag is-light" :class="current.status === 'matched' ? 'is-success' : ''">{{ matchLabel(current) }}</span></p>
            <ul v-if="current.validations && current.validations.length" class="recon-lines">
              <li v-for="v in current.validations" :key="v.key">
                <router-link v-if="v.to" :to="v.to">{{ v.code || v.key }}</router-link>
                <span v-else>{{ v.code || v.key }}</span>
                <span class="has-text-muted"> · {{ v.type }} · {{ v.contact }}</span>
                <b v-if="v.amount !== undefined"> {{ money(v.amount) }}</b>
              </li>
            </ul>
            <div class="recon-form-actions">
              <b-button type="is-danger" outlined size="is-small" @click="undo(current)">Desfés la conciliació</b-button>
            </div>
            <p class="help">Desfer treu les validacions, torna els documents a pendents si els havia marcat com a cobrats o pagats, i esborra les operacions o despeses que havia creat.</p>
          </template>

          <template v-else>
            <h3 class="recon-h3">Propostes</h3>
            <p v-if="!current.suggestions || !current.suggestions.length" class="has-text-muted">Cap línia de Tresoreria té aquest import en dates properes.</p>
            <div v-for="(s, i) in current.suggestions" :key="i" class="recon-suggestion">
              <div>
                <span class="tag is-light" :class="s.auto ? 'is-success' : 'is-info'">{{ suggestionLabel(s) }}</span>
                <ul class="recon-lines">
                  <li v-for="l in s.lines" :key="l.id">
                    <router-link v-if="l.to" :to="l.to" target="_blank">{{ l.code }}</router-link>
                    <span v-else>{{ l.code }}</span>
                    <span class="has-text-muted"> · {{ l.type }} · {{ l.contact || "—" }} · {{ date(l.date) }} · {{ l.account }}</span>
                    <b> {{ money(l.amount) }}</b>
                    <span v-if="l.pending" class="tag is-warning is-light">pendent: es marcarà com a {{ l.amount > 0 ? "cobrat" : "pagat" }}</span>
                  </li>
                </ul>
                <small v-if="s.kind === 'partial'" class="has-text-muted">Es registrarà un cobrament o pagament parcial de {{ money(current.amount) }}.</small>
              </div>
              <b-button size="is-small" type="is-primary" @click="acceptSuggestion(current, s)">Accepta</b-button>
            </div>

            <h3 class="recon-h3">Tria les línies</h3>
            <b-field>
              <b-input v-model="query" placeholder="Cerca per document, contacte o import" icon="magnify" @update:model-value="searchSoon" />
            </b-field>
            <b-table :data="candidates" :striped="false" class="recon-table recon-candidates" :paginated="candidates.length > 15" :per-page="15">
              <b-table-column label="" v-slot="props">
                <b-checkbox :model-value="!!picked[props.row.id]" @update:model-value="pick(props.row, $event)" />
              </b-table-column>
              <b-table-column label="Document" v-slot="props">
                <router-link v-if="props.row.to" :to="props.row.to" target="_blank">{{ props.row.code }}</router-link>
                <span v-else>{{ props.row.code }}</span>
                <small class="has-text-muted">&nbsp;· {{ props.row.type }}</small>
              </b-table-column>
              <b-table-column label="Contacte" v-slot="props">{{ props.row.contact || "—" }}</b-table-column>
              <b-table-column label="Data" v-slot="props">{{ date(props.row.date) }}</b-table-column>
              <b-table-column label="Compte" v-slot="props">{{ props.row.account }}</b-table-column>
              <b-table-column label="Import" numeric v-slot="props">
                {{ money(props.row.amount) }}
                <b-input
                  v-if="picked[props.row.id] && props.row.pending"
                  v-model="picked[props.row.id].amount"
                  size="is-small"
                  type="number"
                  step="0.01"
                  class="recon-part"
                  title="Import cobrat o pagat ara (un cobrament o pagament parcial si és menys)"
                />
              </b-table-column>
              <template #empty>
                <p class="box-empty">Cap línia pendent de conciliar coincideix amb la cerca.</p>
              </template>
            </b-table>
            <div class="recon-sum">
              <span>Triades: {{ selection.count }} · Sumen <b>{{ money(selection.sum) }}</b> de {{ money(current.amount) }}</span>
              <span v-if="selection.count && !selection.ok" class="has-text-danger"> · Falten {{ money(selection.missing) }}</span>
              <b-button size="is-small" type="is-primary" :disabled="!selection.ok" @click="acceptPicked">Concilia amb les línies triades</b-button>
            </div>

            <h3 class="recon-h3">Sense document</h3>
            <div class="recon-form">
              <b-field label="Crea">
                <b-select v-model="create.kind">
                  <option value="annotation">Operació de tresoreria</option>
                  <option v-if="current.amount < 0" value="expense">Despesa pagada</option>
                </b-select>
              </b-field>
              <b-field label="Concepte"><b-input v-model="create.comment" /></b-field>
              <b-field label="Projecte">
                <b-select v-model="create.project">
                  <option :value="null">—</option>
                  <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
                </b-select>
              </b-field>
              <template v-if="create.kind === 'expense'">
                <b-field label="Proveïdora">
                  <b-select v-model="create.contact">
                    <option :value="null">—</option>
                    <option v-for="c in contacts" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </b-select>
                </b-field>
                <b-field label="Tipus de despesa">
                  <b-select v-model="create.document_type">
                    <option :value="null">—</option>
                    <option v-for="d in documentTypes" :key="d.id" :value="d.id">{{ d.name }}</option>
                  </b-select>
                </b-field>
              </template>
            </div>
            <div class="recon-form-actions">
              <b-button size="is-small" type="is-primary" outlined :disabled="create.kind === 'expense' && (!create.contact || !create.project)" @click="createRecord">
                Crea {{ create.kind === "expense" ? "la despesa" : "l'operació" }} i concilia
              </b-button>
              <b-button v-if="current.transfer_with" size="is-small" outlined @click="transfer">És un traspàs entre comptes</b-button>
              <b-button size="is-small" outlined @click="ignore">Ignora</b-button>
            </div>
          </template>
        </div>
      </div>
    </b-modal>
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import { startLoad } from "@/domain/latestLoad.js";
import { formatMoney } from "@/helpers/format-number";
import {
  STATUS_FILTERS,
  RULE_ACTIONS,
  RULE_DIRECTIONS,
  suggestionLabel,
  matchLabel,
  selectionTotals,
  acceptPayload,
  partialAmount,
  readFileAsBase64,
  importSummary,
  reconciliationApi,
  errorMessage
} from "@/domain/bankReconciliation.js";

const relationId = (v) => (v && typeof v === "object" ? v.id : v || null);

export default {
  name: "BankReconciliation",
  data() {
    return {
      isLoading: false,
      tab: "movements",
      tabs: [
        { id: "movements", label: "Moviments" },
        { id: "rules", label: "Regles" },
        { id: "imports", label: "Extractes" }
      ],
      statusFilters: STATUS_FILTERS,
      ruleActions: RULE_ACTIONS,
      ruleDirections: RULE_DIRECTIONS,
      status: "pending",
      bankAccount: null,
      bankAccounts: [],
      movements: [],
      file: null,
      detailOpen: false,
      current: null,
      query: "",
      candidates: [],
      picked: {},
      create: { kind: "annotation", comment: "", project: null, contact: null, document_type: null },
      rules: [],
      rule: null,
      imports: [],
      projects: [],
      contacts: [],
      documentTypes: [],
      lookupsLoaded: false
    };
  },
  computed: {
    kpis() {
      const pending = this.movements.filter((m) => m.status === "pending");
      const sum = (list) => Math.round(list.reduce((s, m) => s + m.amount, 0) * 100) / 100;
      return {
        pending: pending.length,
        in: sum(pending.filter((m) => m.amount > 0)),
        out: sum(pending.filter((m) => m.amount < 0)),
        suggested: pending.filter((m) => (m.suggestions && m.suggestions.length) || m.transfer_with || m.rule_suggestion).length
      };
    },
    selection() {
      return selectionTotals(this.current, this.picked);
    },
    ruleIsValid() {
      const r = this.rule;
      return Boolean(r && r.name && r.pattern && r.action && (r.action !== "expense" || (r.contact && r.project)));
    }
  },
  watch: {
    status() {
      this.load();
    },
    bankAccount() {
      this.load();
    },
    tab(tab) {
      if (tab === "rules") this.loadRules();
      if (tab === "imports") this.loadImports();
    }
  },
  async mounted() {
    this.bankAccounts = (await service({ requiresAuth: true }).get("bank-accounts?_limit=-1")).data || [];
    this.load();
  },
  methods: {
    suggestionLabel,
    matchLabel,
    money(v) {
      return formatMoney(v);
    },
    date(v) {
      return v ? moment(v, "YYYY-MM-DD").format("DD/MM/YYYY") : "—";
    },
    datetime(v) {
      return v ? moment(v).format("DD/MM/YYYY HH:mm") : "—";
    },
    label(list, id) {
      const item = list.find((x) => x.id === id);
      return item ? item.label : id;
    },
    linesSummary(lines) {
      return lines.map((l) => `${l.code} · ${l.contact || l.type}`).join(", ");
    },
    fail(error, fallback) {
      this.$buefy.snackbar.open({ message: errorMessage(error, fallback), type: "is-danger", queue: false, duration: 8000 });
    },
    done(message) {
      this.$buefy.snackbar.open({ message, type: "is-success", queue: false });
    },
    async load() {
      const isStale = startLoad(this);
      this.isLoading = true;
      try {
        const answer = await reconciliationApi.load({ status: this.status, ...(this.bankAccount ? { bank_account: this.bankAccount } : {}) });
        if (isStale()) return;
        this.movements = (answer && answer.movements) || [];
        if (this.current) this.current = this.movements.find((m) => m.id === this.current.id) || null;
      } catch (error) {
        this.fail(error, "No s'han pogut carregar els moviments");
      } finally {
        if (!isStale()) this.isLoading = false;
      }
    },
    async loadLookups() {
      if (this.lookupsLoaded) return;
      const api = service({ requiresAuth: true, cached: true });
      const [projects, contacts, documentTypes] = await Promise.all([
        api.get("projects/basic?_sort=name&_limit=-1"),
        api.get("contacts/basic?_sort=name&_limit=-1"),
        api.get("document-types?type=expense&_limit=-1")
      ]);
      this.projects = projects.data || [];
      this.contacts = contacts.data || [];
      this.documentTypes = documentTypes.data || [];
      this.lookupsLoaded = true;
    },
    async upload(file) {
      if (!file) return;
      this.isLoading = true;
      try {
        const content = await readFileAsBase64(file);
        const r = await reconciliationApi.importFile(file.name, content);
        this.$buefy.dialog.alert({
          title: "Extracte pujat",
          message: importSummary(r, { money: formatMoney, date: this.date })
            .map((p) => `<p>${p}</p>`)
            .join(""),
          confirmText: "D'acord"
        });
        this.status = "pending";
        await this.load();
      } catch (error) {
        this.fail(error, "No s'ha pogut pujar l'extracte");
      } finally {
        this.file = null;
        this.isLoading = false;
      }
    },
    async runAuto() {
      this.isLoading = true;
      try {
        const r = await reconciliationApi.auto();
        this.done(`${r.matched + r.transfers + r.ruled} moviments conciliats automàticament`);
        await this.load();
      } catch (error) {
        this.fail(error, "No s'ha pogut conciliar");
      } finally {
        this.isLoading = false;
      }
    },
    async open(row) {
      this.current = row;
      this.query = "";
      this.picked = {};
      this.candidates = [];
      this.create = { kind: "annotation", comment: row.concept || "", project: null, contact: null, document_type: null };
      this.detailOpen = true;
      if (row.status === "pending") {
        this.search();
        this.loadLookups();
      }
    },
    searchSoon() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.search(), 300);
    },
    async search() {
      if (!this.current) return;
      try {
        const r = await reconciliationApi.candidates(this.current.id, this.query);
        this.candidates = r.lines || [];
      } catch (error) {
        this.fail(error, "No s'han pogut buscar les línies");
      }
    },
    pick(line, on) {
      const next = { ...this.picked };
      if (on) next[line.id] = { line, amount: partialAmount(this.current, line) };
      else delete next[line.id];
      this.picked = next;
    },
    async run(work, message) {
      this.isLoading = true;
      try {
        await work();
        this.done(message);
        this.detailOpen = false;
        await this.load();
      } catch (error) {
        this.fail(error, "No s'ha pogut desar");
      } finally {
        this.isLoading = false;
      }
    },
    acceptSuggestion(movement, s) {
      const lines = s.kind === "partial" ? [{ id: s.lines[0].id, amount: movement.amount }] : s.lines.map((l) => ({ id: l.id }));
      return this.run(() => reconciliationApi.accept(movement.id, lines), "Moviment conciliat");
    },
    acceptPicked() {
      return this.run(() => reconciliationApi.accept(this.current.id, acceptPayload(this.picked)), "Moviment conciliat");
    },
    createRecord() {
      const body = { ...this.create };
      return this.run(() => reconciliationApi.create(this.current.id, body), body.kind === "expense" ? "Despesa creada i conciliada" : "Operació creada i conciliada");
    },
    transfer() {
      return this.run(() => reconciliationApi.transfer(this.current.id, this.current.transfer_with), "Traspàs conciliat");
    },
    ignore() {
      return this.run(() => reconciliationApi.ignore(this.current.id), "Moviment ignorat");
    },
    undo(movement) {
      this.$buefy.dialog.confirm({
        title: "Desfer la conciliació",
        message: "Es treuen les validacions del moviment, els documents que s'havien marcat com a cobrats o pagats tornen a pendents i s'esborren les operacions o despeses que s'havien creat. Voleu continuar?",
        confirmText: "Desfés",
        cancelText: "Cancel·la",
        type: "is-danger",
        onConfirm: () => this.run(() => reconciliationApi.undo(movement.id), "Conciliació desfeta")
      });
    },
    async loadRules() {
      try {
        this.rules = (await reconciliationApi.rules()) || [];
        this.loadLookups();
      } catch (error) {
        this.fail(error, "No s'han pogut carregar les regles");
      }
    },
    async loadImports() {
      try {
        this.imports = (await reconciliationApi.imports()) || [];
      } catch (error) {
        this.fail(error, "No s'han pogut carregar els extractes");
      }
    },
    editRule(rule) {
      this.rule = rule
        ? {
            id: rule.id,
            name: rule.name,
            pattern: rule.pattern,
            direction: rule.direction || "any",
            action: rule.action || "annotation",
            active: rule.active !== false,
            bank_account: relationId(rule.bank_account),
            project: relationId(rule.project),
            contact: relationId(rule.contact),
            document_type: relationId(rule.document_type)
          }
        : { name: "", pattern: "", direction: "any", action: "annotation", active: true, bank_account: null, project: null, contact: null, document_type: null };
    },
    async saveRule() {
      try {
        await reconciliationApi.saveRule(this.rule);
        this.rule = null;
        this.done("Regla desada");
        await this.loadRules();
      } catch (error) {
        this.fail(error, "No s'ha pogut desar la regla");
      }
    },
    async deleteRule() {
      try {
        await reconciliationApi.deleteRule(this.rule.id);
        this.rule = null;
        await this.loadRules();
      } catch (error) {
        this.fail(error, "No s'ha pogut esborrar la regla");
      }
    }
  }
};
</script>

<style scoped>
.recon-tabs {
  margin-bottom: 1rem;
}
.recon-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  align-items: center;
  margin-left: auto;
}
.recon-help {
  margin: 0 0 1rem;
  font-size: .875rem;
  color: var(--a-muted);
  max-width: 72rem;
}
.recon-page .doc-kpis {
  margin-bottom: 1rem;
}
.recon-table {
  font-variant-numeric: tabular-nums;
}
.recon-table :deep(tbody tr) {
  cursor: pointer;
}
.recon-concept {
  word-break: break-word;
}
.recon-suggest {
  font-size: .875rem;
}
.box-empty {
  padding: 1.5rem 1.25rem;
  color: var(--a-muted);
}
.recon-rule-add,
.recon-form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  padding: .75rem 1.25rem;
}
.recon-rule-form {
  margin-top: 1rem;
}
.recon-form {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: .5rem 1rem;
  padding: 0 1.25rem;
}
.recon-detail .recon-form,
.recon-detail .recon-form-actions {
  padding-left: 0;
  padding-right: 0;
}
.recon-detail-concept {
  margin-bottom: 1rem;
  font-weight: 600;
}
.recon-h3 {
  margin: 1.25rem 0 .5rem;
  font-weight: 700;
}
.recon-suggestion {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: .5rem 0;
  border-bottom: 1px solid var(--a-line);
}
.recon-lines {
  margin: .25rem 0;
  font-size: .875rem;
}
.recon-part {
  display: inline-block;
  width: 7rem;
  margin-left: .5rem;
}
.recon-sum {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  padding: .5rem 0;
}
.recon-sum .button {
  margin-left: auto;
}
@media (max-width: 768px) {
  .recon-actions {
    margin-left: 0;
  }
}
</style>
