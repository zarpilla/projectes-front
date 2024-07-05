<template>
  <div>
    <orders-form :id="id" />
  </div>
</template>

<script>
import TitleBar from "@/components/TitleBar";
import OrdersForm from "@/components/OrdersForm";
import { mapState } from "vuex";

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
