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
        if (this.counter) {
          const startTime = moment(this.counter.created_at, 'YYYY-MM-DDTHH:mm:ss.000Z')
          const endTime = moment()
          const duration = moment.duration(endTime.diff(startTime));
          const hours = parseInt(duration.asHours());
          const minutes = parseInt(duration.asMinutes())%60;
          const secondsDiff = endTime.diff(startTime, 'seconds') - hours*60*60 - minutes*60;                    
          const counterDisplayTimeInHours = hours + (minutes/60) + (secondsDiff/3600)        
          this.counterDisplayTime = `${hours}h ${minutes}m ${secondsDiff}s (${counterDisplayTimeInHours.toFixed(3)}h)`        

          this.$emit('update', { counterDisplayTimeInHours: counterDisplayTimeInHours, counterDisplayTime: this.counterDisplayTime })
          // this.form.hours = counterDisplayTimeInHours.toFixed(3)
        }
      }, 1000)
    },
  }
}
</script>
