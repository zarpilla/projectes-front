<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <div
        class="file-info is-flex is-flex-wrap-wrap is-align-items-center mb-5"
      >
        <download-excel
          class="export"
          :fetch="downloadCustomers"
          :escapeCsv="false"
          name="CLI.ods"
          :fields="contasolClientFields"
        >
          <b-button icon-left="download" class="mb-2">Clientes (CLI)</b-button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadProviders"
          :escapeCsv="false"
          name="PRO.ods"
          :fields="contasolProviderFields"
        >
          <b-button icon-left="download" class="mb-2">Proveïdores (PRO)</b-button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadInvoices"
          :escapeCsv="false"
          name="FAC.ods"
          :fields="contasolInvoiceFields"
        >
          <b-button icon-left="download" class="mb-2">Factures emeses (FAC)</b-button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadInvoicesLines"
          :escapeCsv="false"
          name="LFA.ods"
          :fields="contasolInvoiceLinesFields"
        >
          <b-button icon-left="download" class="mb-2">Linies de factures emeses (LFA)</b-button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadPayableEffects"
          :escapeCsv="false"
          name="EFP.ods"
          :fields="contasolPayableEffectsFields"
        >
          <b-button icon-left="download" class="mb-2">Efectes comercials a pagar (EFP)</b-button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadSupportedVAT"
          :escapeCsv="false"
          name="IVS.ods"
          :fields="contasolSupportedVATFields"
        >
          <b-button icon-left="download" class="mb-2">IVA suportat (IVS)</b-button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadReppercutedVAT"
          :escapeCsv="false"
          name="IVR.ods"
          :fields="contasolReppercutedVATFields"
        >
          <b-button icon-left="download" class="mb-2">IVA repercutit (IVR)</b-button>
        </download-excel>
      </div>
    </section>
  </div>
</template>
<script>
import TitleBar from "@/components/TitleBar.vue";
import CardComponent from "@/components/CardComponent.vue";
import contasolCustomersClient from "@/service/contasol-clients";
import contasolProvidersClient from "@/service/contasol-providers";
import contasolInvoicesClient from "@/service/contasol-invoices";
import contasolPayableEffectsClient from "@/service/contasol-payable-effects";

export default {
  name: "Documentation",
  components: {
    CardComponent,
    TitleBar
  },
  computed: {
    titleStack() {
      return ["Contasol", "Exportació de dades"];
    }
  },
  data() {
    return {
      contasolClientFields: null,
      contasolProviderFields: null,
      contasolInvoiceFields: null,
      contasolInvoiceLinesFields: null,
      contasolPayableEffectsFields: null,
      contasolSupportedVATFields: null,
      contasolReppercutedVATFields: null
    };
  },
  methods: {
    async downloadCustomers() {
      const clients = await contasolCustomersClient.getData();
      return clients;
    },
    async downloadProviders() {
      const providers = await contasolProvidersClient.getData();
      return providers;
    },
    async downloadInvoices() {
      const invoices = await contasolInvoicesClient.getData();
      return invoices;
    },
    async downloadInvoicesLines() {
      const invoicesLines = await contasolInvoicesClient.getLinesData();
      return invoicesLines;
    },
    async downloadPayableEffects() {
      const payableEffects = await contasolPayableEffectsClient.getData();
      return payableEffects;
    },
    async downloadSupportedVAT() {
      const supportedVAT = await contasolPayableEffectsClient.getSupportedVATData();
      return supportedVAT;
    },
    async downloadReppercutedVAT() {
      const reppercutedVAT = await contasolInvoicesClient.getReppercutedVATData();
      return reppercutedVAT;
    }
  },
  created() {
    this.contasolClientFields = contasolCustomersClient.getFields();
    this.contasolProviderFields = contasolProvidersClient.getFields();
    this.contasolInvoiceFields = contasolInvoicesClient.getFields();
    this.contasolInvoiceLinesFields = contasolInvoicesClient.getLinesFields();
    this.contasolPayableEffectsFields = contasolPayableEffectsClient.getFields();
    this.contasolSupportedVATFields = contasolPayableEffectsClient.getSupportedVATFields();
    this.contasolReppercutedVATFields = contasolInvoicesClient.getReppercutedVATFields();
  }
};
</script>
