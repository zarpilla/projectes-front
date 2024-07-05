<template>
  <div>
    <contact-us-form />    
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import ContactUsForm from "@/components/ContactUsForm";
import { mapState } from "vuex";

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
    ...mapState(["me"]),
  },
};
</script>
<style>
</style>
