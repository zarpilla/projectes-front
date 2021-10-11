export default {
  data () {
    return {
      registration: null,
      updateExists: false
    }
  },
  created () {
    // Listen for our custom event from the SW registration
    document.addEventListener('swUpdated', this.updateAvailable, {
      once: true
    })

    // this.updateAvailable({ detail: '' })

    // Prevent multiple refreshes
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.refreshing) return
        this.refreshing = true
        // Here the actual reload of the page occurs
        window.location.reload()
      })
    }
  },
  methods: {
    updateAvailable (event) {
      this.registration = event.detail
      this.updateExists = true
      this.$buefy.snackbar.open({
        indefinite: true,
        message: 'Hi ha una actualització disponible. L\'aplicació s\'actualitzarà',
        cancelText: 'No',
        onAction: e => {
          this.refreshApp()
        }
      })
    },
    refreshApp () {
      this.updateExists = false
      // Make sure we only send a 'skip waiting' message if the SW is waiting
      if (!this.registration || !this.registration.waiting) return
      // send message to SW to skip the waiting and activate the new SW
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }
}
