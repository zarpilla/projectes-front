<template>
  <div>
    <contact-us-form />    
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import ContactUsForm from "@/components/ContactUsForm.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

export default {
  name: "ContactUs",
  components: {    
    TitleBar,
    ContactUsForm
  },
  props: {    
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
