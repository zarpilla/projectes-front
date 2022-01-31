<template>
  <div>
    <contacts-form :id="id" />
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import ContactsForm from "@/components/ContactsForm";
import { mapState } from "vuex";

export default {
  name: "InvoiceForm",
  components: {    
    TitleBar,
    ContactsForm
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
