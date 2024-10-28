<template>
  <div>
    <contacts-user-form :id="id" />
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import ContactsUserForm from "@/components/ContactsUserForm";
import { mapState } from "vuex";

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
    ...mapState(["me"]),
  },
};
</script>
<style>
</style>
