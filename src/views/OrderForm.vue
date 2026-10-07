<template>
  <div>
    <orders-form :id="id" />
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar.vue";
import OrdersForm from "@/components/OrdersForm.vue";
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";

export default {
  name: "OrderForm",
  components: {    
    TitleBar,
    OrdersForm
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
  },
};
</script>
<style>
</style>
