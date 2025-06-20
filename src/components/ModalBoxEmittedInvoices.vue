<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card modal-card-dedication">
      <header class="modal-card-head">
        <p class="modal-card-title">Esborranys de factures</p>
      </header>
      <form @submit.prevent="submit" v-if="invoice">
        <section class="modal-card-body">
          <p class="mb-3 has-text-weight-bold" v-if="toReal === false">
            Atenció! Aquesta factura s'emetrà com a <span class="tag is-warning">ESBORRANY</span>, amb les dades següents, que podran ser modificades posteriorment fins
            que sigui validada.
          </p>
          <p class="mb-3 has-text-weight-bold" v-if="toReal === true">
            Atenció! Aquesta factura passara a <span class="tag is-primary">VALIDADA</span> i s'emetrà amb les dades següents, que no
            podran ser modificades posteriorment.
          </p>

          <p class="has-text-weight-bold">Dades de la factura:</p>
          <p class="zhas-text-weight-bold">
            Sèrie de factura: {{ serie ? serie.name : "-" }}
          </p>
          <p class="zhas-text-weight-bold">
            Data de la factura: {{ invoice.emitted | formatDMYDate }}
          </p>
          <p class="zhas-text-weight-bold">
            Import base: {{ invoice.totalBase }} €
          </p>
          <p class="zhas-text-weight-bold">
            Import IVA: {{ invoice.totalVat }} €
          </p>
          <p class="zhas-text-weight-bold">
            Import IRPF: {{ invoice.totalIrpf }} €
          </p>
          <p class="zhas-text-weight-bold">
            Import total amb IVA i IRPF: {{ invoice.total }} €
          </p>
          <p class="zhas-text-weight-bold" v-if="invoice.paybefore">
            Data de venciment: {{ invoice.paybefore | formatDMYDate }}
          </p>
          <p class="zhas-text-weight-bold" v-else>Data de venciment: -</p>

          <p class="zhas-text-weight-bold">
            Mètode de pagament: {{ paymentMethod ? paymentMethod.name : "-" }}
          </p>

          <p class="mt-3 mb-3 has-text-weight-bold">Dades del client:</p>
          <p class="zhas-text-weight-bold">Nom: {{ invoice.contact.name }}</p>
          <p class="zhas-text-weight-bold">NIF: {{ invoice.contact.nif }}</p>

          <p class="mt-3 mb-3 has-text-weight-bold" v-if="toReal === true">
            Si us plau, revisa bé les dades de la factura abans de validar-la.
          </p>
        </section>
        <footer class="modal-card-foot">
          <button class="button" type="button" @click="cancel">
            Cancel·la
          </button>
          <button class="button is-primary" native-type="submit">
            D'acord
          </button>
        </footer>
      </form>
    </div>
  </b-modal>
</template>

<script>
import ModalBox from "@/components/ModalBox";
import moment from "moment";

export default {
  name: "ModalBoxInvoicing",
  components: { ModalBox },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    invoice: {
      type: Object,
      default: null
    },
    series: {
      type: Array,
      default: () => []
    },
    paymentMethods: {
      type: Array,
      default: () => []
    },
    toReal: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isModalActive: false
    };
  },
  computed: {
    serie: function() {
      return (
        this.series.find(serie => serie.id === this.invoice.serial) || null
      );
    },
    paymentMethod: function() {
      return (
        this.paymentMethods.find(
          method => method.id === this.invoice.payment_method
        ) || null
      );
    }
  },
  watch: {
    isActive(newValue) {
      this.isModalActive = newValue;
      if (newValue) {
        this.show();
      } else {
        this.cancel();
      }
    }
  },
  methods: {
    show() {},
    cancel() {
      this.$emit("cancel");
    },
    submit() {
      this.$emit("yes", this.form);
    }
  },
  filters: {
    formatDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).fromNow();
    },
    formatDMYDate(val) {
      if (!val) {
        return "-";
      }
      return moment(val).format("DD/MM/YYYY");
    },
    formatTitle(val) {
      if (!val) {
        return "-";
      }
      return (
        moment(val).format("dddd DD/MM/YYYY") +
        " (" +
        moment(val).fromNow() +
        ")"
      );
    }
  }
};
</script>
