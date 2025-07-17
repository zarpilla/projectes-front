<template>
  <b-modal :active.sync="isModalActive" has-modal-card :on-cancel="cancel">
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Nou punt d'entrega</p>
      </header>
      <section class="modal-card-body" v-if="isModalActive">
        <contacts-user-form :id="id" :owner-id="ownerId" :modal="true" @cancel="cancel" @confirm="confirm" :can-edit="canEdit"/>         
      </section>
    </div>
  </b-modal>
</template>

<script>
import ContactsUserForm from "@/components/ContactsUserForm";

export default {
  name: 'ModalBoxContactUser',
  components: {    
    ContactsUserForm
  },
  props: {
    isActive: {
      type: Boolean,
      default: false
    },
    ownerId: {
      type: Number,
      default: 0
    },
    id: {
      type: Number,
      default: 0
    },
    canEdit: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      isModalActive: false,
      titleStack: ['Punts entrega'],
      task: 1,
      description: ''
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
    confirm (msg) {
      this.$emit('confirm', msg)
    }
  }
}
</script>
