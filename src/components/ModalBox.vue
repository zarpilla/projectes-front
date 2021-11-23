<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">{{ title }}</p>
      </header>
      <section class="modal-card-body">
        <p>
          {{ message }} <b>{{ trashObjectName }}</b>
        </p>
        <p v-if="!canUndo">No es podrà desfer.</p>
      </section>
      <footer class="modal-card-foot">
        <button class="button" type="button" @click="cancel">Cancel·la</button>
        <button class="button is-danger" @click="confirm">{{okButton}}</button>
      </footer>
    </div>
  </b-modal>
</template>

<script>
export default {
  name: 'ModalBox',
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    trashObjectName: {
      type: String,
      default: null
    },
    message: {
      type: String,
      default: 'S\'esborrarà permanentment l\'activitat'
    },
    title: {
      type: String,
      default: 'Esborrar?'
    },
    okButton: {
      type: String,
      default: 'Esborra'
    },
    canUndo: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      isModalActive: false
    }
  },
  watch: {
    isActive (newValue) {
      this.isModalActive = newValue
    },
    isModalActive (newValue) {
      if (!newValue) {
        this.cancel()
      }
    }
  },
  methods: {
    cancel () {
      this.$emit('cancel')
    },
    confirm () {
      this.$emit('confirm')
    }
  }
}
</script>
