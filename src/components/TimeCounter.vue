<template>
  <div>
    <div v-if="counter">
      {{ counterDisplayTime }}
    </div>
  </div>
</template>

<script>
import ModalBox from '@/components/ModalBox'
import moment from 'moment'
import CardComponent from '@/components/CardComponent'
import ModalBoxDedication from '@/components/ModalBoxDedication'

moment.locale('ca')

export default {
  name: 'TimeCounter',
  components: { ModalBox, CardComponent, ModalBoxDedication },
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
          const startTime = moment(this.counter.start, 'YYYY-MM-DDTHH:mm:ss.000Z')
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
