<template>
    <div class="money_format">{{ formatPrice(value) }} <template v-if="currencyCode !== '' && currencyCode !== 'EUR'">{{ currencyCode }}</template><template v-else>€</template></div>
</template>

<script>
export default {
  name: 'MoneyFormat',
  props: {
    value: {
      type: Number,
      default: 0
    },
    locale: {
      type: String,
      default: 'ca'
    },
    currencyCode: {
      type: String,
      default: 'EUR'
    },
    subunitsValue: {
      type: Boolean,
      default: false
    },
    hideSubunits: {
      type: Boolean,
      default: false
    },
    currency: {
      type: String,
      default: ''
    }
  },
  methods: {
    formatPrice (value) {
      const val = (value / 1).toFixed(2).replace('.', ',')
      return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }
    /*
                      :value="totalBase"
                  :locale="'es'"
                  :currency-code="'EUR'"
                  :subunits-value="false"
                  :hide-subunits="false"
                   */
  }
}
</script>
<style scoped>
.money_format {
    text-align: right;
}
</style>

