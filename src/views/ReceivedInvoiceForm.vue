<template>
  <div>
    <document-form :id="id" type="received-invoices" />
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import DocumentForm from "@/components/DocumentForm.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

export default {
  name: "ReceivedInvoiceForm",
  components: {    
    TitleBar,
    DocumentForm
  },
  props: {
    id: {
      type: [String, Number],
      default: null,
    },
  },
  data() {
    return {
      isLoading: false
    };
  },
  computed: {
    ...mapState(useMainStore, ["me"]),    
  },
};
</script>
<style>
</style>
