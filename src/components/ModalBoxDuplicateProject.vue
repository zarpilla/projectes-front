<template>
  <!-- "Duplicar projecte": what is copied, what to do with the dates, and a real way
       out. Cancel·la, the close button, Escape and an outside click only cancel. -->
  <b-modal v-model="isModalActive" has-modal-card aria-role="dialog" aria-modal @cancel="cancel">
    <div class="modal-card duplicate-project-modal">
      <header class="modal-card-head">
        <p class="modal-card-title">Duplicar projecte</p>
      </header>
      <section class="modal-card-body">
        <p><b>Es crearà una còpia del projecte amb:</b></p>
        <ul class="duplicate-list">
          <li>El nom seguit de «(còpia)»</li>
          <li>Totes les fases originals i d'execució</li>
          <li>Tots els ingressos i despeses previstos</li>
          <li>Totes les hores planificades</li>
        </ul>
        <p class="duplicate-note">No es copien els documents adjunts, les factures ni les justificacions.</p>
        <fieldset class="duplicate-dates">
          <legend>Dates de la còpia</legend>
          <b-radio v-model="moveDates" :native-value="true" name="duplicate-dates">Mou totes les dates un any endavant</b-radio>
          <b-radio v-model="moveDates" :native-value="false" name="duplicate-dates">Mantén les dates originals</b-radio>
        </fieldset>
        <p class="duplicate-note">La còpia no es desa fins que facis «Confirmar duplicat».</p>
      </section>
      <footer class="modal-card-foot">
        <button class="button" type="button" @click="cancel">Cancel·la</button>
        <button class="button is-primary" type="button" @click="confirm">Duplica</button>
      </footer>
    </div>
  </b-modal>
</template>

<script>
export default {
  name: 'ModalBoxDuplicateProject',
  // confirm(moveDates: boolean) | cancel()
  emits: ['cancel', 'confirm'],
  props: {
    isActive: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      isModalActive: false,
      moveDates: true,
      confirmed: false
    }
  },
  watch: {
    isActive (newValue) {
      this.isModalActive = newValue
      if (newValue) {
        this.moveDates = true
        this.confirmed = false
      }
    },
    isModalActive (newValue) {
      // closed by Buefy (Escape, outside click) without confirming: a cancel
      if (!newValue && !this.confirmed) {
        this.cancel()
      }
    }
  },
  methods: {
    cancel () {
      this.isModalActive = false
      this.$emit('cancel')
    },
    confirm () {
      this.confirmed = true
      this.isModalActive = false
      this.$emit('confirm', this.moveDates)
    }
  }
}
</script>

<style scoped>
.duplicate-list {
  list-style: disc;
  margin: .5rem 0 .75rem 1.25rem;
}
.duplicate-note {
  color: var(--a-muted);
  font-size: .875rem;
}
.duplicate-dates {
  margin: 1rem 0;
  padding: .75rem 1rem;
  border: 1px solid var(--a-line);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.duplicate-dates legend {
  padding: 0 .375rem;
  font-weight: 800;
}
</style>
