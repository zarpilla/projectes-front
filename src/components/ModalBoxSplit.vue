<template>
  <b-modal v-model="isModalActive" has-modal-card @cancel="cancel">
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <p class="modal-card-title">Edició de pressupost</p>
      </header>
      <form @submit.prevent="submit" v-if="invoicingObject && invoicingObject.subphase">
        <section class="modal-card-body">
          <!-- {{ invoicingObject.subphase }} -->
          <b-field grouped>
            <b-field label="Quantitat" class="medium-field">
              <div class="readonly subphase-detail-input">
                {{ invoicingObject.subphase.quantity }}
              </div>
            </b-field>
            <b-field label="Preu" class="medium-field">
              <b-input
                name="PreuUnitari"
                placeholder="Preu per unitat"
                v-model="newAmount"                
                class="subphase-detail-input"
                @update:model-value="fixDecimals(newAmount)"
              >
              </b-input>
            </b-field>
            <b-field label="Total" class="medium-field">
              <div class="readonly subphase-detail-input">
                <money-format
                  :value="
                    invoicingObject.subphase.quantity *
                    newAmount
                      ? invoicingObject.subphase.quantity *
                        newAmount
                      : 0
                  "
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value="false"
                  :hide-subunits="false"
                >
                </money-format>
              </div>
            </b-field>
          </b-field>
          <b-field grouped>
            <b-field label="Quantitat" class="medium-field">
              <div class="readonly subphase-detail-input">
                {{ invoicingObject.subphase.quantity }}
              </div>
            </b-field>
            <b-field label="Preu" class="medium-field">
              <div class="readonly subphase-detail-input split-rest">
                {{ formatNumber(newAmount2, 2, 2) }}
              </div>
            </b-field>
            <b-field label="Total" class="medium-field">
              <div class="readonly subphase-detail-input">
                <money-format
                  :value="
                    invoicingObject.subphase.quantity *
                    newAmount2
                      ? invoicingObject.subphase.quantity *
                        newAmount2
                      : 0
                  "
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value="false"
                  :hide-subunits="false"
                >
                </money-format>
              </div>
            </b-field>
          </b-field>
          <!-- the repeat / divide actions, with what each does: they were ten
               buttons in the footer that overflowed it and hid Cancel·la (issues/132) -->
          <div class="split-actions">
            <div class="split-action-group">
              <p class="split-action-label">Repeteix cada mes</p>
              <p class="split-action-hint">Còpies de la línia als mesos següents; el total es multiplica.</p>
              <div class="buttons">
                <button
                  v-for="n in repeatOptions"
                  :key="'x' + n"
                  class="button is-small"
                  type="button"
                  :title="`Repeteix la línia ${n} vegades, una per mes: el total es multiplica per ${n}`"
                  @click="split('x' + n)"
                >×{{ n }}</button>
              </div>
            </div>
            <div class="split-action-group">
              <p class="split-action-label">Reparteix en mesos</p>
              <p class="split-action-hint">Divideix l'import en línies mensuals; el total no canvia.</p>
              <div class="buttons">
                <button
                  v-for="n in repeatOptions"
                  :key="'d' + n"
                  class="button is-small"
                  type="button"
                  :title="`Reparteix l'import en ${n} línies, una per mes: el total no canvia`"
                  @click="split('d' + n)"
                >÷{{ n }}</button>
              </div>
            </div>
          </div>
        </section>
        <footer class="modal-card-foot split-foot">
          <button class="button" type="button" @click="cancel">
            Cancel·la
          </button>
          <button
            class="button is-primary"
            native-type="submit"
            title="Separa la línia en dues: la primera amb el preu indicat, la segona amb la resta"
          >
            Separa en dues línies
          </button>
        </footer>
      </form>
    </div>
    <!-- <div>
      {{ dedicationObject }}
    </div> -->

    <modal-box
      :is-active="isDeleteModalActive"
      :trash-object-name="trashObjectName"
      @confirm="trashConfirm"
      @cancel="trashCancel"
    />
  </b-modal>
</template>

<script>
import ModalBox from "@/components/ModalBox.vue";
import MoneyFormat from "@/components/MoneyFormat.vue";
import { formatNumber } from "@/helpers/format-number";

export default {
  name: "ModalBoxInvoicing",
  emits: ["action", "cancel", "delete", "submit"],
  components: { ModalBox, MoneyFormat },
  props: {
    isActive: {
      type: Boolean,
      default: false,
    },
    invoicingObject: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      isModalActive: false,
      newAmount: 0,
      trashObject: null,
      isDeleteModalActive: false,
      repeatOptions: [2, 3, 4, 12],
    };
  },
  computed: {
    newAmount2() {
      return this.invoicingObject.subphase.amount - this.newAmount
    },
    trashObjectName() {
      if (this.trashObject) {
        return this.trashObject.name;
      }

      return null;
    },
  },
  watch: {
    isActive(newValue) {
      this.isModalActive = newValue;
      if (newValue) {
        this.show();
      } else {
        this.cancel();
      }
    },
    invoicingObject(newValue) {
      this.newAmount = this.invoicingObject.subphase.amount
    },
  },
  methods: {
    formatNumber,
    show() {
      // this.newAmount = invoicingObject.subphase.amount
    },
    cancel() {
      this.$emit("cancel");
    },
    submit() {
      const action = {
        action: 'split',
        phase: this.invoicingObject.phase,
        subphase: this.invoicingObject.subphase,
        j: this.invoicingObject.j,
        i: this.invoicingObject.i,
        amount: this.invoicingObject.subphase.amount - this.newAmount,
        type: this.invoicingObject.type
      }
      this.$emit("submit", action);
    },
    split(option) {
      const action = {
        action: option,
        phase: this.invoicingObject.phase,
        subphase: this.invoicingObject.subphase,
        j: this.invoicingObject.j,
        i: this.invoicingObject.i,
        type: this.invoicingObject.type
      }
      this.$emit("action", action);
    },
    // x2() {
    //   const action = {
    //     action: 'x2',
    //     phase: this.invoicingObject.phase,
    //     subphase: this.invoicingObject.subphase,
    //     j: this.invoicingObject.j,
    //     i: this.invoicingObject.i,
    //     type: this.invoicingObject.type
    //   }
    //   this.$emit("action", action);
    // },
    // x12 () {
    //   const action = {
    //     action: 'x12',
    //     phase: this.invoicingObject.phase,
    //     subphase: this.invoicingObject.subphase,
    //     j: this.invoicingObject.j,
    //     i: this.invoicingObject.i,
    //     type: this.invoicingObject.type
    //   }
    //   this.$emit("action", action);
    // },
    trashCancel() {
      this.isDeleteModalActive = false;
    },
    async trashConfirm() {
      this.isDeleteModalActive = false;
      this.$emit("delete", this.form);
    },
    fixDecimals(value) {
      if (value && value.toString().includes(",")) {
        this.newAmount = value.toString().replace(",", ".");
      }
    }    
  },
};
</script>
<style scoped>
.modal-card-body {
  min-height: 150px;
}
.split-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 2rem;
  border-top: 1px solid var(--a-line-soft);
  padding-top: 1rem;
}
.split-action-label {
  font-weight: 600;
}
.split-action-hint {
  font-size: 0.85em;
  color: var(--a-muted);
  margin-bottom: 0.5rem;
}
.split-foot {
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* Global styles for modal card dedication */
:global(.modal-card-dedication .field:not(:last-child)) {
  margin-bottom: 1.5rem;
}
:global(.modal-card-dedication .modal-card-body) {
  max-height: calc(100vh - 200px);
}
</style>
