<template>
  <div>
    <contacts-form :id="id" />
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import ContactsForm from "@/components/ContactsForm.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

export default {
  name: "ContactForm",
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
    ...mapState(useMainStore, ["me"]),
  },
};
</script>
<style>
</style>
