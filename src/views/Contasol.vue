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
          name="CLI.xlsx"
          :fields="contasolClientFields"
        >
          <button class="button is-warning mr-2">
            Clientes (CLI)
          </button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadProviders"
          :escapeCsv="false"
          name="PRO.xlsx"
          :fields="contasolProviderFields"
        >
          <button class="button is-warning mr-2">
            Proveïdores (PRO)
          </button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadInvoices"
          :escapeCsv="false"
          name="FAC.xlsx"
          :fields="contasolInvoiceFields"
        >
          <button class="button is-warning mr-2">
            Factures emeses (FAC)
          </button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadInvoicesLines"
          :escapeCsv="false"
          name="LFA.xlsx"
          :fields="contasolInvoiceLinesFields"
        >
          <button class="button is-warning mr-2">
            Linies de factures emeses (LFA)
          </button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadPayableEffects"
          :escapeCsv="false"
          name="EFP.xlsx"
          :fields="contasolPayableEffectsFields"
        >
          <button class="button is-warning mr-2">
            Efectes comercials a pagar (EFP)
          </button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadSupportedVAT"
          :escapeCsv="false"
          name="IVS.xlsx"
          :fields="contasolSupportedVATFields"
        >
          <button class="button is-warning mr-2">
            IVA suportat (IVS)
          </button>
        </download-excel>
        <download-excel
          class="export"
          :fetch="downloadReppercutedVAT"
          :escapeCsv="false"
          name="IVR.xlsx"
          :fields="contasolReppercutedVATFields"
        >
          <button class="button is-warning mr-2">
            IVA repercutit (IVR)
          </button>
        </download-excel>
      </div>
    </section>
  </div>
</template>
<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
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
