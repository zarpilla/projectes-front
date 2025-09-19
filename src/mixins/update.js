export default {
  data () {
    return {
      registration: null,
      updateExists: false,
      updateCheckInterval: null
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

    // AGGRESSIVE UPDATE CHECK - Check every 30 seconds for waiting service workers
    if (navigator.serviceWorker) {
      this.startUpdateChecking()

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
  beforeDestroy () {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval)
    }
  },
  methods: {
    startUpdateChecking () {
      console.log('Starting aggressive update checking every 30 seconds')
      
      // Check immediately
      this.checkForUpdates()
      
      // Then check every 30 seconds
      this.updateCheckInterval = setInterval(() => {
        this.checkForUpdates()
      }, 30000)
    },
    
    checkForUpdates () {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          if (registration.waiting && !this.updateExists) {
            console.log('FOUND WAITING SERVICE WORKER - triggering update notification')
            this.updateAvailable({ detail: registration })
          }
          
          // Also check if there's an installing worker that becomes waiting
          if (registration.installing) {
            registration.installing.addEventListener('statechange', () => {
              if (registration.installing.state === 'installed' && navigator.serviceWorker.controller && !this.updateExists) {
                console.log('Installing worker became installed - triggering update notification')
                setTimeout(() => {
                  this.updateAvailable({ detail: registration })
                }, 1000)
              }
            })
          }
        })
      }).catch(error => {
        console.error('Error checking for service worker updates:', error)
      })
    },
    
    updateAvailable (event) {
      console.log('updateAvailable called with event:', event)
      if (this.updateExists) {
        console.log('Update notification already shown, skipping')
        return
      }
      
      this.registration = event.detail
      this.updateExists = true
      
      // Clear the interval since we found an update
      if (this.updateCheckInterval) {
        clearInterval(this.updateCheckInterval)
        this.updateCheckInterval = null
      }
      
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
