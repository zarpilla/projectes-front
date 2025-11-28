<template>
  <div class="mt-2">
    <div v-for="(yearData, i) in rows" :key="i" class="mb-3" style="border: 1px solid #ddd; padding: 15px; border-radius: 5px;">
      <div class="is-flex mb-3">
        <b-field
          :label="i === 0 ? 'Any' : null"
          style="width: 20%;"
          class="mr-3"
        >
          <b-select :value="getYearId(yearData)" @input="updateYearValue(yearData, $event)">
            <option v-for="(year, index) in years" :key="index" :value="year.id">
              {{ year.year }}
            </option>
          </b-select>
        </b-field>
        <b-field
          :label="i === 0 ? 'Esborra' : null"
          class="ml-auto"
          style="width: 15%"
        >
          <button
            class="button is-small is-danger"
            type="button"
            @click.prevent="removeYear(i)"
          >
            <b-icon icon="trash-can" size="is-small" />
          </button>
        </b-field>
      </div>
      
      <div class="columns">
        <div class="column">
          <b-field label="Import a justificar total">
            <b-input 
              v-model="yearData.grantable_amount_total" 
              placeholder="Import a justificar total"
              type="number"
              step="0.01"
              @input="changeValue(yearData, 'grantable_amount_total', yearData.grantable_amount_total)" 
            />
          </b-field>
        </div>
        <div class="column">
          <b-field label="Import a justificar amb nòmines">
            <b-input 
              v-model="yearData.grantable_amount" 
              placeholder="Import a justificar amb nòmines"
              type="number"
              step="0.01"
              @input="changeValue(yearData, 'grantable_amount', yearData.grantable_amount)" 
            />
          </b-field>
        </div>
      </div>
      
      <div class="columns">
        <div class="column">
          <b-field label="Import a justificar amb factures indirectes">
            <b-input 
              v-model="yearData.grantable_structural_expenses_justify_invoices" 
              placeholder="Import a justificar amb factures indirectes"
              type="number"
              step="0.01"
              @input="changeValue(yearData, 'grantable_structural_expenses_justify_invoices', yearData.grantable_structural_expenses_justify_invoices)" 
            />
          </b-field>
        </div>
        <div class="column">
          <b-field label="Despeses indirectes no justificables">
            <b-input 
              v-model="yearData.grantable_structural_expenses" 
              placeholder="Despeses indirectes no justificables"
              type="number"
              step="0.01"
              @input="changeValue(yearData, 'grantable_structural_expenses', yearData.grantable_structural_expenses)" 
            />
          </b-field>
        </div>
      </div>
      
      <div class="columns">
        <div class="column">
          <b-field label="Import cofinançament">
            <b-input 
              v-model="yearData.grantable_cofinancing" 
              placeholder="Import de cofinançament"
              type="number"
              step="0.01"
              @input="changeValue(yearData, 'grantable_cofinancing', yearData.grantable_cofinancing)" 
            />
          </b-field>
        </div>
        <div class="column">
          <!-- Empty column for symmetry -->
        </div>
      </div>
    </div>
    
    <button
      class="button is-small is-primary"
      type="button"
      @click.prevent="addYear()"
    >
      <b-icon icon="plus-circle" size="is-small mr-1" />
      Afegir any
    </button>
  </div>
</template>

<script>
export default {
  name: 'ProjectGrantableYears',
  props: {
    grantableYears: {
      type: Array,
      required: true
    },
    years: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      rows: []
    };
  },
  mounted() {
    console.log("ProjectGrantableYears mounted");
    this.rows = [...this.grantableYears];
  },
  watch: {
    grantableYears: {
      handler(newVal) {
        this.rows = [...newVal];
      },
      deep: true
    }
  },
  methods: {
    addYear() {
      const defaultYearId = this.years && this.years.length > 0 ? this.years[0].id : null;
      this.rows.push({
        year: defaultYearId,
        grantable_amount_total: 0,
        grantable_amount: 0,
        grantable_structural_expenses_justify_invoices: 0,
        grantable_structural_expenses: 0,
        grantable_cofinancing: 0
      });
      this.$emit("updated", this.rows);
    },
    removeYear(i) {
      this.rows = this.rows.filter((row, index) => index !== i);
      this.$emit("updated", this.rows);
    },
    changeValue(row, field, value) {
      if (value && value.toString().includes(",")) {
        row[field] = value.toString().replace(",", ".");
      } else {
        row[field] = value;
      }
      this.$emit("updated", this.rows);
    },
    getYearId(yearData) {
      // Handle both cases: when year is an object (from DB) or just an ID (from dropdown)
      if (yearData.year && typeof yearData.year === 'object') {
        return yearData.year.id;
      }
      return yearData.year;
    },
    updateYearValue(yearData, selectedYearId) {
      // When user selects from dropdown, store just the ID
      yearData.year = selectedYearId;
      this.$emit("updated", this.rows);
    }
  }
};
</script>

<style scoped>
.year-section {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 15px;
}
</style>