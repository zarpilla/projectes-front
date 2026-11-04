<template>
  <!-- IVA › Models 303 i 390: mark a return as filed, or download its file for
       the AEAT's form («Importar» on the Sede) -->
  <b-modal v-model="isModalActive" has-modal-card @cancel="cancel">
    <div class="modal-card vat-return-modal">
      <header class="modal-card-head">
        <p class="modal-card-title">{{ title }}</p>
      </header>
      <form @submit.prevent="submit">
        <section class="modal-card-body">
          <p class="vat-return-result">
            Resultat: <b>{{ money(result) }}</b>
          </p>
          <b-field v-if="model === '303'" label="Tipus de declaració">
            <b-select v-model="form.declaration_type" expanded required data-test="declaration-type">
              <option v-for="t in types" :key="t" :value="t">{{ t }} · {{ typeLabels[t] }}</option>
            </b-select>
          </b-field>
          <template v-if="mode === 'file'">
            <b-field label="Data de presentació">
              <b-input v-model="form.filed_date" type="date" required data-test="filed-date" />
            </b-field>
            <b-field label="Número de justificant" message="El que dona la Seu de l'AEAT en presentar-la (13 xifres).">
              <b-input v-model="form.receipt" maxlength="20" data-test="receipt" />
            </b-field>
            <b-field label="Notes">
              <b-input v-model="form.notes" type="textarea" rows="2" />
            </b-field>
            <p class="vat-return-help">
              Es desen les caselles i els documents tal com són ara. Si després canvia algun document d'aquest període, la pantalla ho avisarà.
              {{ model === '303' ? "Les quotes a compensar del període següent sortiran d'aquesta declaració." : "" }}
            </p>
          </template>
          <template v-else>
            <b-field v-if="needsIban" label="IBAN" message="El compte per domiciliar l'ingrés o rebre la devolució.">
              <b-input v-model="form.iban" required data-test="iban" />
            </b-field>
            <p class="vat-return-help">
              El fitxer es pot importar al formulari del model {{ model }} de la Seu electrònica de l'AEAT («Importar»), on es revisa i es presenta.
              Comprova-hi les caselles abans de presentar-lo.
            </p>
          </template>
        </section>
        <footer class="modal-card-foot">
          <b-button native-type="submit" type="is-primary" :loading="saving" data-test="vat-return-submit">
            {{ mode === 'file' ? "Marca com a presentada" : "Descarrega el fitxer" }}
          </b-button>
          <b-button @click="cancel">Cancel·la</b-button>
        </footer>
      </form>
    </div>
  </b-modal>
</template>

<script>
import moment from "moment";
import service from "@/service/index";
import { formatMoney } from "@/helpers/format-number";
import { DECLARATION_TYPES, declarationTypesFor } from "@/domain/vatModels.js";

// the API's message, also when the answer was asked for as a file (a Blob)
async function errorMessage(error) {
  const data = error && error.response && error.response.data;
  if (data && typeof data.text === "function") {
    try {
      const json = JSON.parse(await data.text());
      return (json.error && json.error.message) || error.message;
    } catch (e) {
      return error.message;
    }
  }
  return (data && data.error && data.error.message) || error.message;
}

export default {
  name: "VatReturnModal",
  props: {
    isActive: { type: Boolean, default: false },
    // file: mark as filed; download: the AEAT file
    mode: { type: String, default: "file" },
    model: { type: String, default: "303" },
    year: { type: Number, required: true },
    quarter: { type: Number, default: null },
    result: { type: Number, default: 0 },
    defaultType: { type: String, default: null },
    filed: { type: Object, default: null },
    defaultIban: { type: String, default: "" }
  },
  emits: ["cancel", "done"],
  data() {
    return {
      isModalActive: false,
      saving: false,
      typeLabels: DECLARATION_TYPES,
      form: { declaration_type: null, filed_date: "", receipt: "", notes: "", iban: "" }
    };
  },
  computed: {
    period() {
      return this.model === "390" ? "0A" : `${this.quarter}T`;
    },
    title() {
      const what = this.model === "390" ? `Model 390 de ${this.year}` : `Model 303 del ${this.quarter}T ${this.year}`;
      return this.mode === "file" ? `${what}: presentada` : `${what}: fitxer per a l'AEAT`;
    },
    types() {
      return declarationTypesFor(this.result, this.quarter);
    },
    needsIban() {
      return this.form.declaration_type === "U" || this.form.declaration_type === "D";
    }
  },
  watch: {
    isActive(value) {
      this.isModalActive = value;
      if (value) this.reset();
    },
    isModalActive(value) {
      if (!value) this.cancel();
    }
  },
  methods: {
    money(value) {
      return formatMoney(value || 0);
    },
    reset() {
      const filed = this.filed || {};
      const type = filed.declaration_type || this.defaultType;
      this.form = {
        declaration_type: this.types.includes(type) ? type : this.types[0],
        filed_date: filed.filed_date || moment().format("YYYY-MM-DD"),
        receipt: filed.receipt || "",
        notes: filed.notes || "",
        iban: this.defaultIban || ""
      };
    },
    cancel() {
      this.$emit("cancel");
    },
    async submit() {
      this.saving = true;
      try {
        if (this.mode === "file") {
          const body = { model: this.model, year: this.year, period: this.period, filed_date: this.form.filed_date, receipt: this.form.receipt, notes: this.form.notes };
          if (this.model === "303") body.declaration_type = this.form.declaration_type;
          await service({ requiresAuth: true }).post("treasuries/vat-models/returns", body);
          this.$buefy.toast.open({ message: "Declaració marcada com a presentada", type: "is-success" });
        } else {
          const params = { model: this.model, year: this.year, period: this.period };
          if (this.model === "303") params.declaration_type = this.form.declaration_type;
          if (this.needsIban) params.iban = this.form.iban;
          const query = new URLSearchParams(params).toString();
          const { data } = await service({ requiresAuth: true }).get(`treasuries/vat-models/aeat-file?${query}`, { responseType: "blob" });
          const url = URL.createObjectURL(data);
          const link = document.createElement("a");
          link.href = url;
          link.download = this.model === "390" ? `390_${this.year}.txt` : `303_${this.year}_${this.period}.txt`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        this.$emit("done");
      } catch (error) {
        this.$buefy.toast.open({ message: `No s'ha pogut fer: ${await errorMessage(error)}`, type: "is-danger", duration: 6000 });
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.vat-return-modal {
  width: min(32rem, calc(100vw - 2rem));
}
.vat-return-result {
  margin-bottom: 1rem;
  font-variant-numeric: tabular-nums;
}
.vat-return-help {
  margin-top: .75rem;
  font-size: .8125rem;
  color: var(--a-muted);
}
</style>
