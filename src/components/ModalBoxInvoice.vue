<template>
  <b-modal v-model="isModalActive" has-modal-card @cancel="cancel">
    <div class="modal-card modal-card-dedication modal-card-task">
      <header class="modal-card-head">
        <p class="modal-card-title">Hola {{ userName }}</p>
      </header>
      <section class="modal-card-body modal-card-body-festive">
        <pending-invoices-text :invoices="invoices" />
      </section>
      <footer class="modal-card-foot">
          <button class="button is-primary" native-type="submit" @click="submit">D'acord</button>
        </footer>
    </div>
    
  </b-modal>
</template>

<script>
import service from "@/service/index";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import ModalBox from "@/components/ModalBox.vue";
import moment from "moment";
import RadioPicker from "@/components/RadioPicker.vue";
import PendingInvoicesText from "@/components/PendingInvoicesText.vue";
import FileUpload from "@/components/FileUpload.vue";
import { formatMoney } from "@/helpers/format-number";
import { ofWord } from "@/helpers/catalan";

export default {
  name: "ModalBoxTask",
  emits: ["cancel", "submit"],
  components: { ModalBox, RadioPicker, FileUpload, PendingInvoicesText },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    invoices: {
      type: Array,
      default: []
    }
  },
  data() {
    return {
      isModalActive: false
    };
  },
  computed: {
    ...mapState(useMainStore, ["userName", "me"]),
    // «2.272,74 €» (it said «2272.74 €», issues/181)
    sumOfInvoices() {
      return formatMoney(this.invoices.reduce((acc, invoice) => acc + (Number(invoice.total) || 0), 0));
    },
    // the entity's own name, not «La Diligència» for everyone (issues/181)
    ofEntity() {
      return this.me && this.me.name ? ofWord(this.me.name) : "de l'entitat";
    }
  },
  watch: {
    isActive(newValue) {
      if (newValue && !this.isModalActive) {
        this.isModalActive = newValue;
        this.show();
      } else if (!newValue && !this.isModalActive) {
        this.isModalActive = newValue;
        this.cancel();
      } else {
        this.isModalActive = newValue;
      }
    },
    dedicationObject(newValue) {}
  },
  methods: {
    show() {
      this.initializing = true;

      this.initializing = false;
    },
    cancel() {
      this.isModalActive = false;
      this.$emit("cancel");
    },
    submit() {
      this.isModalActive = false;
      this.$emit("submit");
    },
    trashModal(trashObject) {},
    trashCancel() {
      this.isDeleteModalActive = false;
    }
  }
};
</script>
<style></style>
