<template>
  <div>
    <!-- a new type is a new form (issues/123); the form follows id changes itself -->
    <document-form v-if="type" :key="type" :id="id" :type="type" />
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import DocumentForm from "@/components/DocumentForm.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

export default {
  name: "EmittedInvoiceForm",
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
    // read from the route each time: it was set once in created() and kept
    // when going to a document of another type (issues/123)
    type() {
      return this.$route.params.type;
    }
  },
};
</script>
<style>
</style>
