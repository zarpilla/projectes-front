<template>
  <!-- Models 303 i 390 (Beta): the boxes of the AEAT VAT return per quarter
       and for the year, and the documents behind each box -->
  <div class="vat-models-page">
    <b-loading :is-full-page="true" v-model="isLoading" :can-cancel="false" />

    <div class="notification is-warning is-light beta-notice" role="note">
      <b>En proves (Beta).</b> Les xifres són orientatives, per contrastar-les amb la gestoria abans de presentar el model.
      ESSTrapis no presenta res a Hisenda.
    </div>

    <form class="filter-bar" role="search" aria-label="Filtres" @submit.prevent>
      <label class="filter-select">
        <span>Any</span>
        <b-select v-model="year" aria-label="Any">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </b-select>
      </label>
      <div class="segmented vat-periods" role="tablist" aria-label="Període">
        <button
          v-for="p in periods"
          :key="String(p.id)"
          type="button"
          role="tab"
          :class="{ 'is-on': quarter === p.id }"
          :aria-selected="quarter === p.id ? 'true' : 'false'"
          @click="selectPeriod(p.id)"
        >
          {{ p.label }}
        </button>
      </div>
    </form>

    <div class="doc-kpis">
      <div class="doc-kpi">
        <span>{{ quarter ? `Resultat del T${quarter}` : "Resultat de l'any" }}</span>
        <b :class="boxes['71'] > 0 ? 'has-text-danger' : ''">{{ money(boxes['71']) }}</b>
        <small>{{ boxes['71'] > 0 ? "a ingressar" : boxes['71'] < 0 ? (quarter === 4 || !quarter ? "a compensar o retornar" : "a compensar") : "sense activitat" }}</small>
      </div>
      <div class="doc-kpi">
        <span>IVA meritat</span>
        <b>{{ money(boxes['27']) }}</b>
        <small>casella 27</small>
      </div>
      <div class="doc-kpi">
        <span>IVA deduïble</span>
        <b>{{ money(boxes['45']) }}</b>
        <small>casella 45{{ data.deductible_pct < 100 ? ` · prorrata ${data.deductible_pct} %` : "" }}</small>
      </div>
      <div class="doc-kpi">
        <span>{{ quarter ? "Termini" : "Model 390" }}</span>
        <b>{{ quarter ? date(deadline) : `30/01/${year + 1}` }}</b>
        <small>{{ quarter ? "per presentar el 303" : "resum anual" }}</small>
      </div>
    </div>

    <section class="a-box vat-return-bar" data-test="return-bar">
      <div class="vat-return-status">
        <template v-if="currentFiled">
          <span class="tag is-success is-light">Presentada</span>
          <span>
            el {{ date(currentFiled.filed_date) }}<template v-if="currentFiled.declaration_type"> · {{ currentFiled.declaration_type }} ({{ typeLabels[currentFiled.declaration_type] }})</template><template v-if="currentFiled.receipt"> · justificant {{ currentFiled.receipt }}</template>
          </span>
          <a v-if="currentFiled.receipt_file" :href="receiptUrl(currentFiled.receipt_file)" target="_blank" rel="noopener" data-test="receipt-link">Justificant de l'AEAT (PDF)</a>
          <label v-else class="button is-small is-text vat-receipt-attach" data-test="receipt-attach">
            Adjunta el justificant (PDF)
            <input type="file" accept="application/pdf,.pdf" class="is-hidden" @change="attachReceipt">
          </label>
        </template>
        <template v-else>
          <span class="tag is-light">Sense presentar</span>
          <span class="has-text-muted">Quan la presentis, marca-la: se'n desen les caselles i els documents.</span>
        </template>
      </div>
      <div class="vat-return-actions">
        <b-button size="is-small" icon-left="download" data-test="aeat-file" @click="openModal('download')">Fitxer per a l'AEAT</b-button>
        <b-button v-if="quarter" size="is-small" icon-left="file-pdf-box" data-test="model-pdf" :loading="makingPdf" @click="downloadPdf">PDF del model</b-button>
        <b-button size="is-small" type="is-primary" data-test="mark-filed" @click="openModal('file')">{{ currentFiled ? "Torna a marcar" : "Marca com a presentada" }}</b-button>
        <b-button v-if="currentFiled" size="is-small" type="is-text" data-test="unfile" @click="unfile">Desmarca</b-button>
      </div>
      <div v-if="currentChanges" class="notification is-danger is-light vat-return-changes" data-test="changes">
        <b>Han canviat dades d'aquest període des que es va presentar.</b>
        <ul>
          <li v-for="c in currentChanges.boxes" :key="'b' + c.box">Casella {{ c.box }}: {{ money(c.filed) }} → {{ money(c.now) }}</li>
          <li v-for="d in currentChanges.documents || []" :key="d.key">
            {{ changeLabels[d.change] }}: <router-link :to="`/document/${d.id}/${d.kind}`">{{ d.code || d.id }}</router-link>
            {{ d.contact ? `(${d.contact})` : "" }} · IVA {{ money(d.vat) }}<template v-if="d.filed"> (era {{ money(d.filed.vat) }})</template>
          </li>
        </ul>
        <p>Si cal corregir-la, presenta'n una de rectificativa i torna-la a marcar.</p>
      </div>
      <div v-if="check390" class="notification is-warning is-light vat-return-changes" data-test="check390">
        <b>{{ check390.title }}</b>
        <span v-if="check390.differs">El 390 surt dels documents tal com són ara; han de sumar el mateix que els 303 que es van presentar.</span>
        <ul>
          <li v-for="(l, i) in check390.lines" :key="i">
            {{ l.text }}
            <b-button v-if="l.quarter" size="is-small" type="is-text" @click="selectPeriod(l.quarter)">Veure el T{{ l.quarter }}</b-button>
          </li>
        </ul>
        <p v-if="check390.differs">Si un document es va entrar o canviar després de presentar el trimestre, cal presentar-ne una rectificativa i tornar-la a marcar.</p>
        <p v-else>Quan els presentis, marca'ls: el 390 es compara amb el que es va presentar.</p>
      </div>
    </section>

    <section v-if="showFinalProrrata" class="a-box vat-final-prorrata" data-test="final-prorrata">
      <div>
        <b>Prorrata definitiva de {{ year }}</b>
        <p class="has-text-muted">
          Provisional {{ data.deductible_pct }} %<template v-if="data.prorrata && data.prorrata.definitive !== null"> · estimada {{ data.prorrata.definitive }} % (a partir de les operacions classificades)</template>.
          La regularització va a la casella 44 del T4 i a la 522 del 390.
        </p>
      </div>
      <div class="vat-final-prorrata-form">
        <b-input v-model="finalPct" type="number" min="0" max="100" step="1" size="is-small" aria-label="Prorrata definitiva (%)" placeholder="%" />
        <b-button size="is-small" :loading="savingProrrata" @click="saveFinalProrrata(finalPct)">Desa</b-button>
        <b-button v-if="data.final_deductible_pct !== null" size="is-small" type="is-text" @click="saveFinalProrrata(null)">Treu-la</b-button>
      </div>
    </section>

    <section v-if="issues.length" class="a-box list-box vat-issues">
      <header class="box-head">
        <h2>Per revisar</h2>
        <span class="box-hint">No són a cap casella fins que no es classifiquen. Tria'n una, marca els documents al detall i classifica'ls, o aplica'n la proposta.</span>
      </header>
      <ul>
        <li v-for="i in issues" :key="i.code">
          <button type="button" class="vat-issue" :class="{ 'is-on': issue === i.code }" @click="selectIssue(i.code)">
            <b>{{ i.label }}</b>
            <span>{{ i.count }} {{ i.count === 1 ? "línia" : "línies" }} · base {{ money(i.base) }}</span>
            <small>{{ i.areas.map(a => `${a.label}: ${a.count}`).join(" · ") }}</small>
          </button>
          <p class="vat-issue-text">{{ i.text }}</p>
        </li>
      </ul>
    </section>

    <div v-if="quarter" class="vat-form">
      <section class="a-box list-box">
        <header class="box-head">
          <h2>IVA meritat</h2>
          <span class="box-hint">Factures emeses (sense esborranys) i ingressos</span>
        </header>
        <div class="table-wrap">
          <table class="table is-fullwidth vat-boxes">
            <thead>
              <tr><th scope="col"></th><th scope="col" class="has-text-right">Base</th><th scope="col" class="has-text-right">Quota</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in accrued" :key="r.base" :class="{ 'is-missing': r.missing }">
                <th scope="row">{{ r.label }}<small v-if="r.missing" class="not-computed">no calculat</small></th>
                <td class="has-text-right"><box-value :box="r.base" :value="boxes[r.base]" :on="box" pickable @pick="selectBox" /></td>
                <td class="has-text-right"><box-value :box="r.vat" :value="boxes[r.vat]" :on="box" pickable @pick="selectBox" /></td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="is-total"><th scope="row">Total quota meritada</th><td></td><td class="has-text-right"><box-value box="27" :value="boxes['27']" /></td></tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="a-box list-box">
        <header class="box-head">
          <h2>IVA deduïble</h2>
          <span class="box-hint">Factures rebudes; les despeses (tiquets, dietes…) no compten</span>
        </header>
        <div class="table-wrap">
          <table class="table is-fullwidth vat-boxes">
            <thead>
              <tr><th scope="col"></th><th scope="col" class="has-text-right">Base</th><th scope="col" class="has-text-right">Quota</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in deductible" :key="r.vat" :class="{ 'is-missing': r.missing }">
                <th scope="row">{{ r.label }}<small v-if="r.missing" class="not-computed">no calculat</small></th>
                <td class="has-text-right"><box-value v-if="r.base" :box="r.base" :value="boxes[r.base]" :on="box" pickable @pick="selectBox" /></td>
                <td class="has-text-right"><box-value :box="r.vat" :value="boxes[r.vat]" :on="box" pickable @pick="selectBox" /></td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="is-total"><th scope="row">Total a deduir</th><td></td><td class="has-text-right"><box-value box="45" :value="boxes['45']" /></td></tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section class="a-box list-box">
        <header class="box-head">
          <h2>{{ quarter ? "Resultat" : "Resultat (suma dels trimestres)" }}</h2>
        </header>
        <div class="table-wrap">
          <table class="table is-fullwidth vat-boxes">
            <tbody>
              <tr v-for="r in resultRows" :key="r.box" :class="{ 'is-total': r.total }">
                <th scope="row">{{ r.label }}</th>
                <td class="has-text-right"><box-value :box="r.box" :value="boxes[r.box]" :pct="r.pct" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="a-box list-box">
        <header class="box-head">
          <h2>Informació addicional</h2>
          <span class="box-hint">Bases de les línies al 0 % classificades</span>
        </header>
        <div class="table-wrap">
          <table class="table is-fullwidth vat-boxes">
            <tbody>
              <tr v-for="r in information" :key="r.box">
                <th scope="row">{{ r.label }}</th>
                <td class="has-text-right"><box-value :box="r.box" :value="boxes[r.box]" :on="box" pickable @pick="selectBox" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>

    <!-- the year: the model 390, in its own numbering -->
    <div v-else class="vat-form">
      <section v-for="sec in model390" :key="sec.title" class="a-box list-box vat-390">
        <header class="box-head">
          <h2>{{ sec.title }}</h2>
          <span v-if="sec.title === 'IVA meritat'" class="box-hint">Model 390, amb la seva numeració</span>
        </header>
        <div class="table-wrap">
          <table class="table is-fullwidth vat-boxes">
            <thead v-if="sec.lines.some(l => l.base)">
              <tr><th scope="col"></th><th scope="col" class="has-text-right">Base</th><th scope="col" class="has-text-right">Quota</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in sec.lines" :key="l.vat" :class="{ 'is-total': l.total }">
                <th scope="row">{{ l.label }}</th>
                <td v-if="sec.lines.some(x => x.base)" class="has-text-right"><box-value v-if="l.base" :box="l.base" :value="boxes390[l.base] || 0" /></td>
                <td class="has-text-right">
                  <box-value :box="l.vat" :value="l.pct ? (boxes390[l.vat] === undefined ? null : boxes390[l.vat]) : boxes390[l.vat] || 0" :pct="l.pct" :on="box" :pickable="!!l.from" @pick="selectBox(l.from)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="a-box list-box">
        <header class="box-head"><h2>Per completar</h2></header>
        <ul class="vat-390-notes">
          <li v-if="boxes.unclassified_base">Línies al 0 % sense classificar: {{ money(boxes.unclassified_base) }}. No sumen al volum d'operacions.</li>
          <li v-if="data.model390 && data.model390.unmapped">{{ data.model390.unmapped }} {{ data.model390.unmapped === 1 ? "línia rebuda" : "línies rebudes" }} a un tipus que el 390 no té (base {{ money(data.model390.unmapped_base) }}): sumen al total però a cap tipus.</li>
          <li>El 390 porta també les dades de l'entitat (Configuració › Models d'IVA): activitat, clau, epígraf IAE i CNAE.</li>
          <li>No es calculen el criteri de caixa, el recàrrec d'equivalència, el règim simplificat, la finestreta única (OSS), les importacions ni les deduccions de sectors diferenciats.</li>
        </ul>
      </section>
    </div>

    <section class="a-box list-box">
      <header class="box-head">
        <h2>Detall{{ detailTitle }}</h2>
        <button v-if="box || issue" type="button" class="button is-small is-text" @click="clearDetail">Mostra-ho tot</button>
        <span v-else class="box-hint">Una fila per document i tipus d'IVA. Tria una casella per veure'n els documents.</span>
      </header>
      <div v-if="checkedRows.length" class="vat-classify" role="group" aria-label="Classifica">
        <span class="vat-classify-count">{{ checkedRows.length }} {{ checkedRows.length === 1 ? "seleccionada" : "seleccionades" }}</span>
        <template v-if="checkedIssued.length">
          <b-select v-model="operation" size="is-small" aria-label="Tipus d'operació">
            <option :value="null">Tipus d'operació…</option>
            <option v-for="(label, code) in operationLabels" :key="code" :value="code">{{ label }}</option>
            <option value="clear">Sense classificar</option>
          </b-select>
          <b-button size="is-small" :disabled="!operation || saving" @click="classify('vat_operation', operation)">Classifica les emeses ({{ checkedIssued.length }})</b-button>
        </template>
        <template v-if="checkedReceived.length">
          <b-select v-model="reverseCharge" size="is-small" aria-label="Autoliquidació">
            <option :value="null">Autoliquidació…</option>
            <option v-for="(label, code) in reverseChargeLabels" :key="code" :value="code">{{ label }}</option>
            <option value="clear">Sense classificar</option>
          </b-select>
          <label v-if="selfAssessed.includes(reverseCharge)" class="vat-classify-rate">
            <span>% IVA</span>
            <input v-model="reverseChargeRate" class="input is-small" type="number" min="0" max="100" step="0.01" aria-label="% IVA autoliquidat">
          </label>
          <b-button size="is-small" :disabled="!reverseCharge || saving" @click="classify('reverse_charge', reverseCharge, reverseChargeRate)">Classifica les rebudes ({{ checkedReceived.length }})</b-button>
        </template>
        <template v-if="checkedSpecial.length">
          <b-select v-model="vatSpecial" size="is-small" aria-label="IVA de les rebudes">
            <option :value="null">IVA de les rebudes…</option>
            <option v-for="(label, code) in vatSpecialLabels" :key="code" :value="code">{{ label }}</option>
            <option value="clear">Sense classificar</option>
          </b-select>
          <b-button size="is-small" :disabled="!vatSpecial || saving" @click="classify('vat_special', vatSpecial)">Classifica l'IVA ({{ checkedSpecial.length }})</b-button>
        </template>
        <b-button v-if="checkedWithProposal.length" size="is-small" type="is-primary" :disabled="saving" @click="applyProposals">Aplica la proposta ({{ checkedWithProposal.length }})</b-button>
      </div>
      <b-table
        v-model:checked-rows="checkedRows"
        :data="tableRows"
        :paginated="tableRows.length > 50"
        :per-page="50"
        :striped="false"
        checkable
        :is-row-checkable="r => !!r.classify"
        custom-row-key="key"
        default-sort="date"
        class="vat-documents"
      >
        <b-table-column sortable searchable label="Tipus" field="typeLabel" v-slot="props">
          {{ props.row.typeLabel }}
        </b-table-column>
        <b-table-column sortable searchable label="Document" field="code" v-slot="props">
          <router-link :to="props.row.to">{{ props.row.code || props.row.id }}</router-link>
        </b-table-column>
        <b-table-column sortable searchable label="Contacte" field="contact" v-slot="props">
          {{ props.row.contact || "—" }}
        </b-table-column>
        <b-table-column sortable searchable label="País" field="areaLabel" v-slot="props">
          <span :title="props.row.country">{{ props.row.areaLabel }}</span>
        </b-table-column>
        <b-table-column sortable label="Data" field="date" v-slot="props">
          {{ date(props.row.date) }}
        </b-table-column>
        <b-table-column sortable numeric label="% IVA" field="rate" v-slot="props">
          {{ props.row.rate }} %
        </b-table-column>
        <b-table-column sortable numeric label="Base" field="base" v-slot="props">
          {{ money(props.row.base) }}
        </b-table-column>
        <b-table-column sortable numeric label="IVA" field="vat" v-slot="props">
          {{ money(props.row.vat) }}
        </b-table-column>
        <b-table-column sortable numeric label="Al model" field="returnVat" v-slot="props">
          <b>{{ money(props.row.returnVat) }}</b>
          <small v-if="props.row.vat_box && props.row.side === 'received' && props.row.deductible_pct < 100" class="has-text-muted"> ({{ props.row.deductible_pct }} %)</small>
        </b-table-column>
        <b-table-column sortable label="Caselles" field="boxesLabel" v-slot="props">
          <span v-if="props.row.boxesLabel">{{ props.row.boxesLabel }}</span>
          <span v-else-if="props.row.issue" class="tag is-warning is-light">Per revisar</span>
          <span v-else-if="props.row.not_vat" class="tag is-light">Fora de l'IVA</span>
          <span v-else class="tag is-light">Fora del 303{{ props.row.annual_box ? ` · 390: ${props.row.annual_box}` : "" }}</span>
        </b-table-column>
        <b-table-column sortable searchable label="Classificació" field="classLabel" v-slot="props">
          <span v-if="props.row.classLabel">{{ props.row.classLabel }}</span>
          <small v-else-if="props.row.proposalLabel" class="vat-proposal">Proposta: {{ props.row.proposalLabel }}</small>
          <span v-else-if="props.row.classify" class="has-text-muted">—</span>
        </b-table-column>
        <template #empty>
          <p class="box-empty">No hi ha documents.</p>
        </template>
      </b-table>
      <dl v-if="tableRows.length" class="vat-totals">
        <div><dt>Files</dt><dd>{{ rowsTotals.count }}</dd></div>
        <div><dt>Base</dt><dd>{{ money(rowsTotals.base) }}</dd></div>
        <div class="is-total"><dt>IVA al model</dt><dd>{{ money(rowsTotals.vat) }}</dd></div>
      </dl>
    </section>

    <section v-if="data.notes && data.notes.length" class="a-box list-box vat-notes">
      <header class="box-head"><h2>Com es calcula</h2></header>
      <ul>
        <li v-for="n in data.notes" :key="n.code">
          {{ n.text }}
          <span v-if="n.count" class="has-text-muted">({{ n.count }} {{ n.count === 1 ? "document" : "documents" }}, IVA {{ money(n.vat) }})</span>
        </li>
      </ul>
    </section>

    <vat-model-pdf ref="pdf" :sheet="pdfSheet" />

    <vat-return-modal
      :is-active="!!modal"
      :mode="modal || 'file'"
      :model="quarter ? '303' : '390'"
      :year="year"
      :quarter="quarter"
      :result="quarter ? boxes['71'] : boxes390['86'] || 0"
      :default-type="currentQuarter ? currentQuarter.declaration_type : null"
      :filed="currentFiled"
      @cancel="modal = null"
      @done="modalDone"
    />
  </div>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import { startLoad } from "@/domain/latestLoad.js";
import { formatMoney } from "@/helpers/format-number";
import VatBoxValue from "@/components/VatBoxValue.vue";
import VatReturnModal from "@/components/VatReturnModal.vue";
import { attachVatReceipt, receiptUrl } from "@/service/vatReceipt.js";
import VatModelPdf from "@/components/VatModelPdf.vue";
import {
  ACCRUED, DEDUCTIBLE, RESULT, INFORMATION, MODEL_390, DECLARATION_TYPES, CHANGE_LABELS, AREA_LABELS, KIND_LABELS, ISSUE_LABELS,
  OPERATION_LABELS, REVERSE_CHARGE_LABELS, VAT_SPECIAL_LABELS, SELF_ASSESSED, check390Lines, model303Sheet,
  periodBoxes, filterVatRows, periodIssues, rowVat, vatRowsTotals, classificationLabel, classifyItems
} from "@/domain/vatModels.js";

// «10 / 11 · 36 / 37» for a self-assessed purchase, «120» for an information box
function boxesLabel(r) {
  const parts = [];
  if (r.accrued_boxes) parts.push(r.accrued_boxes.join(" / "));
  if (r.vat_box) parts.push(r.base_box ? `${r.base_box} / ${r.vat_box}` : r.vat_box);
  if (r.info_box) parts.push(r.info_box);
  return parts.join(" · ");
}

const EMPTY = { quarters: [], annual: {}, model390: { boxes: {} }, issues: [], notes: [], rows: [], deductible_pct: 100, final_deductible_pct: null };

export default {
  name: "VatModelsTable",
  components: { BoxValue: VatBoxValue, VatReturnModal, VatModelPdf },
  data() {
    const current = moment().year();
    return {
      isLoading: false,
      selfAssessed: SELF_ASSESSED,
      year: current,
      years: [current + 1, current, current - 1, current - 2, current - 3],
      // the quarter now, or the year for 390
      quarter: moment().quarter(),
      box: null,
      issue: null,
      periods: [
        { id: 1, label: "T1" }, { id: 2, label: "T2" }, { id: 3, label: "T3" }, { id: 4, label: "T4" },
        { id: null, label: "Any (390)" }
      ],
      accrued: ACCRUED,
      deductible: DEDUCTIBLE,
      information: INFORMATION,
      model390: MODEL_390,
      typeLabels: DECLARATION_TYPES,
      changeLabels: CHANGE_LABELS,
      modal: null,
      finalPct: null,
      savingProrrata: false,
      operationLabels: OPERATION_LABELS,
      reverseChargeLabels: REVERSE_CHARGE_LABELS,
      vatSpecialLabels: VAT_SPECIAL_LABELS,
      vatSpecial: null,
      pdfSheet: null,
      makingPdf: false,
      checkedRows: [],
      operation: null,
      reverseCharge: null,
      reverseChargeRate: 21,
      saving: false,
      data: EMPTY
    };
  },
  computed: {
    boxes() {
      return periodBoxes(this.data, this.quarter);
    },
    resultRows() {
      // the year sums the results; the compensations are a quarter's
      return this.quarter ? RESULT : RESULT.filter(r => !["110", "78", "87", "69"].includes(r.box));
    },
    deadline() {
      const q = this.data.quarters.find(x => x.quarter === this.quarter);
      return q ? q.deadline : null;
    },
    issues() {
      return periodIssues(this.data, this.data.rows, this.quarter);
    },
    detailTitle() {
      const period = this.quarter ? ` del T${this.quarter}` : ` de l'any`;
      if (this.box) return `${period} · casella ${this.box}`;
      if (this.issue) return `${period} · ${ISSUE_LABELS[this.issue]}`;
      return period;
    },
    tableRows() {
      return filterVatRows(this.data.rows, { quarter: this.quarter, box: this.box, issue: this.issue }).map(r => ({
        ...r,
        typeLabel: KIND_LABELS[r.kind] || r.kind,
        areaLabel: AREA_LABELS[r.area] || r.area,
        returnVat: r.vat_box ? rowVat(r) : 0,
        boxesLabel: boxesLabel(r),
        classLabel: r.classify ? classificationLabel(r.classify.field, r.classify.value) : "",
        proposalLabel: r.classify && r.proposal ? classificationLabel(r.classify.field, r.proposal) : ""
      }));
    },
    rowsTotals() {
      return vatRowsTotals(this.tableRows.filter(r => r.vat_box));
    },
    boxes390() {
      return (this.data.model390 && this.data.model390.boxes) || {};
    },
    currentQuarter() {
      return this.quarter ? this.data.quarters.find(q => q.quarter === this.quarter) || null : null;
    },
    currentFiled() {
      return this.quarter ? (this.currentQuarter && this.currentQuarter.filed) || null : this.data.filed390 || null;
    },
    // the year: the 390 against the 303s filed
    check390() {
      return this.quarter ? null : check390Lines(this.data.check390, v => this.money(v));
    },
    currentChanges() {
      return this.quarter ? (this.currentQuarter && this.currentQuarter.changes) || null : this.data.changes390 || null;
    },
    // the last quarter and the year, when there is a prorrata to settle
    showFinalProrrata() {
      if (this.quarter && this.quarter !== 4) return false;
      return this.data.deductible_pct < 100 || this.data.final_deductible_pct !== null || !!(this.data.prorrata && this.data.prorrata.definitive !== null && this.data.prorrata.definitive < 100);
    },
    checkedIssued() {
      return this.checkedRows.filter(r => r.classify && r.classify.field === "vat_operation");
    },
    checkedReceived() {
      return this.checkedRows.filter(r => r.classify && r.classify.field === "reverse_charge");
    },
    checkedSpecial() {
      return this.checkedRows.filter(r => r.classify && r.classify.field === "vat_special");
    },
    checkedWithProposal() {
      return this.checkedRows.filter(r => r.classify && r.proposal);
    }
  },
  watch: {
    year() {
      this.clearDetail();
      this.load();
    }
  },
  mounted() {
    this.load();
  },
  methods: {
    money(value) {
      return formatMoney(value || 0);
    },
    date(value) {
      return value ? moment(value, "YYYY-MM-DD").format("DD/MM/YYYY") : "—";
    },
    selectPeriod(id) {
      this.quarter = id;
      this.clearDetail();
    },
    selectBox(box) {
      this.issue = null;
      this.box = this.box === box ? null : box;
    },
    selectIssue(code) {
      this.box = null;
      this.issue = this.issue === code ? null : code;
    },
    clearDetail() {
      this.box = null;
      this.issue = null;
      this.checkedRows = [];
    },
    async classify(field, value, rate = null) {
      await this.sendClassification(classifyItems(this.checkedRows, field, value, rate));
    },
    async applyProposals() {
      await this.sendClassification([
        ...classifyItems(this.checkedRows, "vat_operation"),
        ...classifyItems(this.checkedRows, "reverse_charge"),
        ...classifyItems(this.checkedRows, "vat_special")
      ]);
    },
    openModal(mode) {
      this.modal = mode;
    },
    async modalDone() {
      const reload = this.modal === "file";
      this.modal = null;
      if (reload) await this.load();
    },
    receiptUrl,
    // the quarter as a PDF in the app's style (the AEAT's boxes), with the entity's name and NIF
    async downloadPdf() {
      if (!this.quarter) return;
      this.makingPdf = true;
      try {
        const me = (await service({ requiresAuth: true }).get("me", { cached: true })).data || {};
        this.pdfSheet = model303Sheet({
          year: this.year,
          quarter: this.quarter,
          boxes: this.boxes,
          entity: { name: me.name, nif: me.nif },
          filed: this.currentFiled,
          declarationType: this.currentQuarter ? this.currentQuarter.declaration_type : null,
          formatDate: d => this.date(d)
        });
        await this.$nextTick();
        await this.$refs.pdf.download();
      } catch (e) {
        this.$buefy.toast.open({ message: `No s'ha pogut fer el PDF: ${e.message}`, type: "is-danger" });
      } finally {
        this.pdfSheet = null;
        this.makingPdf = false;
      }
    },
    async attachReceipt(event) {
      const file = event.target.files && event.target.files[0];
      event.target.value = "";
      if (!file || !this.currentFiled) return;
      try {
        await attachVatReceipt(this.currentFiled.id, file);
        this.$buefy.toast.open({ message: "Justificant adjuntat", type: "is-success" });
        await this.load();
      } catch (e) {
        const message = (e.response && e.response.data && e.response.data.error && e.response.data.error.message) || e.message;
        this.$buefy.toast.open({ message: `No s'ha pogut adjuntar: ${message}`, type: "is-danger", duration: 6000 });
      }
    },
    async unfile() {
      if (!this.currentFiled) return;
      if (!window.confirm("Es desmarcarà com a presentada i se n'esborraran la foto de caselles i documents i el justificant adjuntat. Segueixes?")) return;
      try {
        await service({ requiresAuth: true }).delete(`treasuries/vat-models/returns/${this.currentFiled.id}`);
        await this.load();
      } catch (e) {
        this.$buefy.toast.open({ message: `No s'ha pogut desmarcar: ${e.message}`, type: "is-danger" });
      }
    },
    async saveFinalProrrata(pct) {
      this.savingProrrata = true;
      try {
        await service({ requiresAuth: true }).post("treasuries/vat-models/final-prorrata", { year: this.year, pct: pct === "" ? null : pct });
        await this.load();
      } catch (e) {
        const message = (e.response && e.response.data && e.response.data.error && e.response.data.error.message) || e.message;
        this.$buefy.toast.open({ message: `No s'ha pogut desar: ${message}`, type: "is-danger" });
      } finally {
        this.savingProrrata = false;
      }
    },
    async sendClassification(items) {
      if (!items.length) return;
      this.saving = true;
      try {
        const answer = (await service({ requiresAuth: true }).post("treasuries/vat-models/classify", { items })).data;
        const n = (answer && answer.updated) || 0;
        this.$buefy.toast.open({ message: `${n} ${n === 1 ? "document classificat" : "documents classificats"}`, type: "is-success" });
        this.checkedRows = [];
        this.operation = null;
        this.reverseCharge = null;
        this.vatSpecial = null;
        await this.load();
      } catch (e) {
        const message = (e.response && e.response.data && e.response.data.error && e.response.data.error.message) || e.message;
        this.$buefy.toast.open({ message: `No s'ha pogut classificar: ${message}`, type: "is-danger", duration: 5000 });
      } finally {
        this.saving = false;
      }
    },
    async load() {
      const isStale = startLoad(this);
      this.isLoading = true;
      try {
        const answer = (await service({ requiresAuth: true }).get(`treasuries/vat-models?year=${this.year}`)).data;
        if (isStale()) return;
        this.data = answer && answer.rows ? answer : EMPTY;
        this.finalPct = this.data.final_deductible_pct;
      } finally {
        if (!isStale()) this.isLoading = false;
      }
    }
  }
};
</script>
<style scoped>
.beta-notice {
  margin-bottom: 1rem;
}
.vat-models-page .doc-kpis {
  margin-bottom: 1rem;
}
.vat-periods {
  align-self: flex-end;
}
.vat-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}
.vat-form .a-box {
  margin: 0;
}
.vat-boxes {
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.vat-boxes th,
.vat-boxes td {
  vertical-align: middle;
}
.vat-boxes tbody th {
  font-weight: 500;
}
.vat-boxes tr > :first-child {
  padding-left: 1.25rem;
}
.vat-boxes tr > :last-child {
  padding-right: 1.25rem;
  white-space: nowrap;
}
.vat-boxes .is-missing th,
.vat-boxes .is-missing td {
  color: var(--a-muted);
}
.vat-boxes .is-total th,
.vat-boxes .is-total td {
  font-weight: 800;
}
.not-computed {
  margin-left: .5rem;
  font-size: .75rem;
  font-style: italic;
}
.vat-return-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .75rem 1rem;
  margin-bottom: 1rem;
  padding: .875rem 1.25rem;
}
.vat-return-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
}
.vat-return-actions {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
}
.vat-return-changes {
  flex-basis: 100%;
  margin: 0;
}
.vat-return-changes ul {
  margin: .5rem 0;
  padding-left: 1.25rem;
  list-style: disc;
}
.vat-final-prorrata {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: .75rem 1rem;
  margin-bottom: 1rem;
  padding: .875rem 1.25rem;
}
.vat-final-prorrata p {
  font-size: .8125rem;
}
.vat-final-prorrata-form {
  display: flex;
  align-items: center;
  gap: .5rem;
}
.vat-final-prorrata-form .control {
  width: 6rem;
}
.vat-390-notes {
  margin: 0;
  padding: .75rem 1.25rem 1rem 2.25rem;
  list-style: disc;
  font-size: .875rem;
}
.vat-classify {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .5rem;
  padding: .75rem 1.25rem;
  border-bottom: 1px solid var(--a-line);
  background: var(--a-chip);
}
.vat-classify-count {
  font-weight: 700;
  margin-right: .5rem;
}
.vat-classify-rate {
  display: inline-flex;
  align-items: center;
  gap: .25rem;
  font-size: .8125rem;
}
.vat-classify-rate .input {
  width: 5rem;
}
.vat-documents :deep(td.has-text-right) {
  white-space: nowrap;
}
.vat-proposal {
  color: var(--a-muted);
  font-style: italic;
}
.vat-issues,
.vat-notes {
  margin-bottom: 1rem;
}
.vat-issues ul,
.vat-notes ul {
  margin: 0;
  padding: .75rem 1.25rem 1rem;
}
.vat-issues li + li {
  margin-top: .75rem;
}
.vat-issue {
  display: flex;
  flex-wrap: wrap;
  gap: .25rem 1rem;
  align-items: baseline;
  width: 100%;
  padding: .5rem .75rem;
  border: 1px solid var(--a-line);
  border-radius: 8px;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.vat-issue.is-on {
  background: var(--a-chip);
}
.vat-issue small {
  color: var(--a-muted);
}
.vat-issue-text {
  margin: .25rem 0 0 .75rem;
  font-size: .8125rem;
  color: var(--a-muted);
}
.vat-notes li {
  list-style: disc;
  margin-left: 1rem;
  font-size: .875rem;
}
.box-empty {
  padding: 1.5rem 1.25rem;
  color: var(--a-muted);
}
.vat-totals {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: .5rem 2rem;
  margin: 0;
  padding: .875rem 1.25rem;
  border-top: 1px solid var(--a-line);
  font-variant-numeric: tabular-nums;
}
.vat-totals dt {
  font-size: .8125rem;
  color: var(--a-muted);
}
.vat-totals dd {
  margin: 0;
  font-weight: 700;
  text-align: right;
}
.vat-totals .is-total dd {
  font-weight: 800;
  font-size: 1.0625rem;
}
</style>
