<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card modal-card-dedication modal-card-task">
      <header class="modal-card-head">
        <p class="modal-card-title">Hola {{ userName }}</p>
      </header>
      <section class="modal-card-body modal-card-body-festive">
        Aquest missatge és per recordar-te que tens pagaments pendents de les
        factures de servei per un import total de {{ sumOfInvoices }} €.
        <br /><br />T'hem enviat les factures al correu el darrer dia de mes i
        les pots consultar també a la secció de 
        <router-link to="/provider-invoices">FACTURES</router-link>
        aquí mateix a
        l'ESStrapis, on veureu indicades les que estan pendents. Aprofitem per
        recordar que per tenir un seguiment òptim de la facturació, feu una
        transferència per factura amb l'import exacte indicant al concepte: "el
        vostre nom comercial_el mes de facturació_número de factura".<br /><br />
        Si ja has fet el pagament, no en facis cas, una vegada l'informem
        deixarà d'aparèixer aquest missatge!<br /><br />
        Necessitem de la resposabilitat de totes per poder facilitar la gestió i
        us recordem que les factures s'emeten a mes vençut i si acumulem
        impagaments posem en risc la tresoreria de La Diligència.
      </section>
      <footer class="modal-card-foot">
          <button class="button is-primary" native-type="submit" @click="submit">D'acord</button>
        </footer>
    </div>
    
  </b-modal>
</template>

<script>
import service from "@/service/index";
import { mapState } from "vuex";
import ModalBox from "@/components/ModalBox";
import moment from "moment";
import RadioPicker from "@/components/RadioPicker";
import FileUpload from "@/components/FileUpload";

export default {
  name: "ModalBoxTask",
  components: { ModalBox, RadioPicker, FileUpload },
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
    ...mapState(["userName"]),
    sumOfInvoices() {
      return this.invoices.reduce((acc, invoice) => {
        return acc + invoice.total;
      }, 0).toFixed(2);
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
