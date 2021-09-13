<template>
  <b-input ref="input" :value="formattedValue" v-currency="options" @input="handleInput"/>
</template>

<script>
import { setValue, parse as parseCurrency } from 'vue-currency-input'

export default {
  name: 'CurrencyInput',
  props: {
    value: {
      type: Number,
      default: null
    }
  },
  data () {
    return {
      formattedValue: null
    }
  },
  computed: {
    options () {
      return {
        currency: 'EUR',
        locale: 'es',
        distractionFree: false,
        allowNegative: false
      }
    }
  },
  watch: {
    value (value) {
      this.setValue(value)
    }
  },
  mounted () {
    this.setValue(this.value)
  },
  methods: {
    setValue (value) {
      setValue(this.$refs.input, value)
    },
    handleInput (value) {
      this.$emit('input', parseCurrency(value, this.options))
      this.formattedValue = value
    }
  }
}
</script>
