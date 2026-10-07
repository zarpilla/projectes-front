<template>
  <div>
    <contacts-user-form :id="id" />
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import ContactsUserForm from "@/components/ContactsUserForm.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

export default {
  name: "ContactForm",
  components: {    
    TitleBar,
    ContactsUserForm
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
