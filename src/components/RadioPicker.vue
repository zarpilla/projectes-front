<template>
  <b-field grouped group-multiline>
    <div v-for="(v, k) in options" :key="k" class="control">
      <b-radio v-model="newValue" :native-value="k" :type="type" @update:model-value="input">
        {{ v }}
      </b-radio>
    </div>
  </b-field>
</template>

<script>
export default {
  name: 'RadioPicker',
  props: {
    options: {
      type: Object,
      default: null
    },
    type: {
      type: String,
      default: null
    },
    modelValue: {
      type: [String, Number],
      default: null
    }
  },
  emits: ['update:modelValue'],
  data () {
    return {
      newValue: null
    }
  },
  watch: {
    modelValue (newValue) {
      this.newValue = newValue
    }
  },
  created () {
    this.newValue = this.modelValue
  },
  methods: {
    input () {
      this.$emit('update:modelValue', this.newValue)
    }
  }
}
</script>
