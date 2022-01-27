<template>
  <div>
    <document-form :id="id" type="received-invoices" />
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import DocumentForm from "@/components/DocumentForm";
import { mapState } from "vuex";

export default {
  name: "InvoiceForm",
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
    ...mapState(["me"]),    
  },
};
</script>
<style>
</style>
