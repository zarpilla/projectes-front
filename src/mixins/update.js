export default {
  data () {
    return {
      registration: null,
      updateExists: false
    }
  },
  created () {
    console.log('Update mixin created, setting up swUpdated listener')
    // Listen for our custom event from the SW registration
    document.addEventListener('swUpdated', this.updateAvailable, {
      once: true
    })

    // Add manual trigger for testing - remove in production
    if (process.env.NODE_ENV !== 'production') {
      window.testUpdateAvailable = () => {
        console.log('Manually triggering updateAvailable for testing')
        this.updateAvailable({ detail: { waiting: { postMessage: () => {} } } })
      }
    }

    // Fallback: Check for service worker updates manually if we have an old SW
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          // If there's a waiting service worker, it means there's an update ready
          if (registration.waiting) {
            console.log('Found waiting service worker, triggering update notification')
            this.updateAvailable({ detail: registration })
          }
          
          // Listen for future updates on existing registrations
          registration.addEventListener('updatefound', () => {
            console.log('Update found on existing registration')
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                console.log('New worker state:', newWorker.state)
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker installed and ready')
                  this.updateAvailable({ detail: registration })
                }
              })
            }
          })
        })
      })

      // Prevent multiple refreshes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.refreshing) return
        this.refreshing = true
        console.log('Service worker controller changed, reloading page')
        // Here the actual reload of the page occurs
        window.location.reload()
      })
    }
  },
  methods: {
    updateAvailable (event) {
      console.log('updateAvailable called with event:', event)
      this.registration = event.detail
      this.updateExists = true
      this.$buefy.snackbar.open({
        indefinite: true,
        message: 'Hi ha una nova versió disponible. L\'aplicació s\'actualitzarà',
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
