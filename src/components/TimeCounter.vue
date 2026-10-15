<template>
  <div>
    <div v-if="counter">
      {{ counterDisplayTime }}
    </div>
  </div>
</template>

<script>
import ModalBox from '@/components/ModalBox.vue'
import moment from 'moment'
import CardComponent from '@/components/CardComponent.vue'
import { counterElapsed } from '@/service/timeCounter'

moment.locale('ca')

export default {
  name: 'TimeCounter',
  emits: ['update'],
  components: { ModalBox, CardComponent },
  props: {
    counter: {
      type: Object
    }
  },
  data () {
    return {
      counterDisplayTime: '',
      counterDisplayTimeInHours: '',
      counterInterval: 0
    }
  },
  watch: {
    counter: function (newVal, oldVal) {
      clearInterval(this.counterInterval)
      this.doCounter()
    }
  },
  mounted () {
    this.doCounter()
  },
  methods: {
    doCounter() {
      this.counterInterval = setInterval(() => {
        const elapsed = counterElapsed(this.counter)
        if (elapsed) {
          this.counterDisplayTime = elapsed.display

          this.$emit('update', { counterDisplayTimeInHours: elapsed.inHours, counterDisplayTime: this.counterDisplayTime })
          // this.form.hours = counterDisplayTimeInHours.toFixed(3)
        }
      }, 1000)
    },
  }
}
</script>
