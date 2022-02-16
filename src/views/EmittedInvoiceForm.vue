<template>
  <div>
    <document-form v-if="type" :id="id" :type="type" />
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
      isLoading: false,
      type: null
    };
  },
  computed: {
    ...mapState(["me"]),    
  },
  created() {
    this.type = this.$route.params.type
  },
};
</script>
<style>
</style>
