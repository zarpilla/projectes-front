<template>
  <!-- IVA › Models 303 i 390: «PDF del model». Draws nothing: the PDF is built
       with real text by helpers/vatModelPdf.js (it was a picture made with
       html2pdf, nothing could be copied into the AEAT's form). -->
  <span v-if="false" />
</template>

<script>
import moment from "moment";
import { buildModel303Pdf } from "@/helpers/vatModelPdf";

export default {
  name: "VatModelPdf",
  props: {
    // model303Sheet() of domain/vatModels.js, or null
    sheet: { type: Object, default: null }
  },
  methods: {
    async download() {
      if (!this.sheet) return;
      const doc = await buildModel303Pdf(this.sheet, { today: moment().format("DD/MM/YYYY") });
      doc.save(this.sheet.filename);
    }
  }
};
</script>
