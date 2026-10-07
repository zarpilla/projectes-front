<template>
  <b-field grouped group-multiline>
    <div v-for="(v, k) in options" :key="k" class="control">
      <b-checkbox
        v-model="newValue"
        :native-value="k"
        :type="type"
        @update:model-value="input"
      >
        {{ v }}
      </b-checkbox>
    </div>
  </b-field>
</template>

<script>
export default {
  name: 'CheckboxPicker',
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
      type: Array,
      default: () => []
    }
  },
  emits: ['update:modelValue'],
  data () {
    return {
      newValue: []
    }
  },
  watch: {
    modelValue: {
      handler (newValue) {
        this.newValue = newValue
      },
      deep: 1
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
