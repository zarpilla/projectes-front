<template>
  <div class="document-lines">
    <div v-if="lines.length > 50" class="pagination-controls mb-3">
      <b-field grouped>
        <b-field label="Línies" class="ml-auto">
          <b-select v-model="linesPerPage" @change="currentPage = 1">
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="99999"
              >Totes ({{ lines.length }})</option
            >
          </b-select>
        </b-field>
        <b-field
          label="Pàgina"
          v-if="linesPerPage > 0"
          class="mzl-auto"
        >
          <b-pagination
            v-model="currentPage"
            :total="lines.length"
            :per-page="linesPerPage"
            size="is-small"
          ></b-pagination>
        </b-field>
      </b-field>
    </div>
    <ul class="subphases-list">
      <li
        v-for="(line, j) in paginatedLines"
        :key="getLineKey(line, j)"
        class="subphase line mt-2 mb-2"
      >
        <b-field grouped class="is-full-width">
          <b-field
            v-if="isDiet"
            :label="j == 0 ? 'Data' : null"
            class="medium-field"
          >
            <b-datepicker
              v-model="line.date"
              :show-week-number="false"
              :locale="'ca-ES'"
              :first-day-of-week="1"
              icon="calendar-today"
              placeholder="Data"
              trap-focus
              editable
            >
            </b-datepicker>
          </b-field>
          <b-field
            :label="j == 0 ? 'Concepte' : null"
            class="subphase-detail-input-large-field"
          >
            <b-input
              :disabled="disabled"
              name="SubFase"
              placeholder="Concepte..."
              v-model="line.concept"
              class="subphase-detail-input subphase-detail-input-large"
            >
            </b-input>
          </b-field>
          <b-field
            :label="j == 0 ? 'Quantitat' : null"
            class="medium-field"
          >
            <b-input
              name="Unitats"
              :disabled="disabled"
              placeholder="Quantitat, hores, unitats..."
              v-model="line.quantity"
              class="subphase-detail-input"
              @update:model-value="debouncedChangeLine(line, 'quantity', $event)"
            >
            </b-input>
          </b-field>
          <b-field :label="j == 0 ? 'Preu' : null" class="medium-field">
            <b-input
              name="base"
              :disabled="disabled"
              placeholder="Preu per unitat"
              v-model="line.base"
              class="subphase-detail-input"
              @update:model-value="debouncedChangeLine(line, 'base', $event)"
            >
            </b-input>
          </b-field>
          <b-field
            :label="j == 0 ? 'Descompte %' : null"
            class="medium-field"
          >
            <b-input
              :disabled="disabled"
              name="discount"
              placeholder="Descompte"
              v-model="line.discount"
              class="subphase-detail-input"
              @update:model-value="debouncedChangeLine(line, 'discount', $event)"
            >
            </b-input>
          </b-field>
          <b-field
            :label="j == 0 ? 'IVA %' : null"
            class="medium-field"
          >
            <b-input
              :disabled="disabled"
              name="vat"
              placeholder="Preu per unitat"
              v-model="line.vat"
              class="subphase-detail-input"
              @update:model-value="debouncedChangeLine(line, 'vat', $event)"
            >
            </b-input>
          </b-field>
          <b-field
            :label="j == 0 ? 'IRPF %' : null"
            class="medium-field"
          >
            <b-input
              :disabled="disabled"
              name="irpf"
              placeholder="Preu per unitat"
              v-model="line.irpf"
              class="subphase-detail-input"
              @update:model-value="debouncedChangeLine(line, 'irpf', $event)"
            >
            </b-input>
          </b-field>
          <b-field
            :label="j == 0 ? 'Accions' : null"
            class="medium-field"
          >
            <button
              class="button is-small is-primary ml-2"
              type="button"
              @click.prevent="line.show = !line.show"
            >
              <b-icon icon="comment" size="is-small" />
            </button>
            <button
              v-if="lines.length > 1"
              class="button is-small is-danger ml-2"
              type="button"
              @click.prevent="removeLine(line, j)"
              :disabled="disabled"
            >
              <b-icon icon="trash-can" size="is-small" />
            </button>
            <button
              v-if="isLastLineInPagination(j)"
              class="button is-small is-primary ml-2"
              type="button"
              @click.prevent="addLine(line)"
              :disabled="disabled"
            >
              <b-icon icon="plus-circle" size="is-small" />
            </button>
          </b-field>
        </b-field>
        <!-- <b-field
          grouped
          class="is-full-width"
          v-if="products.length > 0"
        >
          <b-autocomplete
            class="is-w-30"
            v-model="line.productSearch"
            placeholder="Escriu el codi del producte..."
            :keep-first="false"
            :open-on-focus="true"
            :data="filteredProducts"
            field="namecode"
            @select="option => productSelected(option, line)"
            :clearable="true"
          >
          </b-autocomplete>
        </b-field> -->
        <b-field
          label="Notes"
          grouped
          class="line-notes is-full-width mb-5"
          :class="line.show ? 'z' : 'is-hidden'"
        >
          <b-input
            type="textarea"
            maxlength="1000"
            :disabled="disabled"
            v-model="line.comments"
            placeholder="Descripció del concepte"
          />
        </b-field>
      </li>
    </ul>
    <!-- Pagination for large lists -->
    <div
      v-if="lines.length > 50"
      class="pagination-controls mt-5 mb-3"
    >
      <b-field grouped>
        <b-field label="Línies" class="ml-auto">
          <b-select v-model="linesPerPage" @change="currentPage = 1">
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="99999"
              >Totes ({{ lines.length }})</option
            >
          </b-select>
        </b-field>
        <b-field
          label="Pàgina"
          v-if="linesPerPage > 0"
          class="mzl-auto"
        >
          <b-pagination
            v-model="currentPage"
            :total="lines.length"
            :per-page="linesPerPage"
            size="is-small"
          ></b-pagination>
        </b-field>
      </b-field>
    </div>
  </div>
</template>

<script>
import _ from "lodash";

// The editable lines of a document (DocumentForm), with pagination for long
// documents. New lines come from the parent's `newLine` factory (diets add two
// preset lines).
export default {
  name: "DocumentLines",
  props: {
    lines: { type: Array, required: true },
    newLine: { type: Function, required: true },
    disabled: { type: Boolean, default: false },
    isDiet: { type: Boolean, default: false }
  },
  emits: ["update:lines"],
  data() {
    return {
      linesPerPage: 50,
      currentPage: 1,
      debouncedInputs: new Map()
    };
  },
  computed: {
    paginatedLines() {
      if (this.linesPerPage === 0 || this.lines.length <= 50) {
        return this.lines;
      }
      const start = (this.currentPage - 1) * this.linesPerPage;
      const end = start + this.linesPerPage;
      return this.lines.slice(start, end);
    }
  },
  beforeUnmount() {
    this.debouncedInputs.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.debouncedInputs.clear();
  },
  methods: {
    debouncedChangeLine(line, field, value) {
      // one pending timeout per line and field
      const lineIndex = this.lines.indexOf(line);
      const key = `${lineIndex}-${field}`;

      if (this.debouncedInputs.has(key)) {
        clearTimeout(this.debouncedInputs.get(key));
      }

      const timeoutId = setTimeout(() => {
        this.changeLine(line, field, value);
        this.debouncedInputs.delete(key);
      }, 300);

      this.debouncedInputs.set(key, timeoutId);
    },
    // decimal comma -> dot
    changeLine(line, field, value) {
      if (value && value.toString().includes(",")) {
        line[field] = value.toString().replace(",", ".");
      }
    },
    addLine() {
      const lines = _.concat(this.lines, this.newLine());
      this.$emit("update:lines", lines);

      // with pagination, go to the last page to show the new line
      if (this.linesPerPage > 0 && lines.length > 50) {
        this.currentPage = Math.ceil(lines.length / this.linesPerPage);
      }
    },
    removeLine(line, j) {
      // index in the full array
      const actualIndex =
        this.linesPerPage > 0 && this.lines.length > 50
          ? (this.currentPage - 1) * this.linesPerPage + j
          : j;

      this.lines.splice(actualIndex, 1);

      // step back if the last line of the page was removed
      if (
        this.linesPerPage > 0 &&
        this.paginatedLines.length === 0 &&
        this.currentPage > 1
      ) {
        this.currentPage--;
      }
    },
    isLastLineInPagination(index) {
      const isLastInPage = index === this.paginatedLines.length - 1;
      const isLastOverall =
        this.linesPerPage === 0 || this.lines.length <= 50
          ? index === this.lines.length - 1
          : (this.currentPage - 1) * this.linesPerPage + index ===
            this.lines.length - 1;

      return isLastInPage && isLastOverall;
    },
    getLineKey(line, index) {
      return line.id || `line-${index}`;
    }
  }
};
</script>
