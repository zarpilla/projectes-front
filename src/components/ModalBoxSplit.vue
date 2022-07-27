<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
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
                @input="fixDecimals(newAmount)"
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
              <b-input
                disabled
                name="PreuUnitari"
                placeholder="Preu per unitat"
                v-model="newAmount2"                
                class="subphase-detail-input"
              >
              </b-input>
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
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="cancel">
            Cancel·la
          </button>
          <!-- <button
            v-if="form.id > 0"
            class="button"
            type="button"
            @click="trashModal(form)"
          >
            Esborra
          </button> -->
          <button class="button is-primary" native-type="submit">
            Separa
          </button>
          <button class="button is-primary" type="button" @click="split('x2')">
            x2
          </button>
          <button class="button is-primary" type="button" @click="split('x3')">
            x3
          </button>
          <button class="button is-primary" type="button" @click="split('x4')">
            x4
          </button>
          <button class="button is-primary" type="button" @click="split('x12')">
            x12
          </button>
          <button class="button is-primary" type="button" @click="split('d2')">
            /2
          </button>
          <button class="button is-primary" type="button" @click="split('d3')">
            /3
          </button>
          <button class="button is-primary" type="button" @click="split('d4')">
            /4
          </button>
          <button class="button is-primary" type="button" @click="split('d12')">
            /12
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
import ModalBox from "@/components/ModalBox";
import MoneyFormat from "@/components/MoneyFormat.vue";

export default {
  name: "ModalBoxInvoicing",
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
    show() {
      // this.newAmount = invoicingObject.subphase.amount
    },
    cancel() {
      this.$emit("cancel");
    },
    submit() {
      console.log('submit!')
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
<style>
.modal-card-dedication .field:not(:last-child) {
  margin-bottom: 1.5rem;
}
.modal-card-dedication .modal-card-body {
  max-height: calc(100vh - 200px);
}
</style>
<style scoped>
.modal-card-body {
  min-height: 150px;
}
</style>
