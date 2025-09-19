/* eslint-disable no-console */

import { register } from 'register-service-worker'

if (process.env.NODE_ENV === 'production') {
  console.log('Registering service worker at:', `${process.env.BASE_URL}service-worker.js`)
  register(`${process.env.BASE_URL}service-worker.js`, {
    ready () {
      console.log('ESSTRAPIS v.1.0.2')
      console.log(
        'App is being served from cache by a service worker.\n' +
        'For more details, visit https://goo.gl/AFskqB'
      )
    },
    registered (registration) {
      console.log('Service worker has been registered.', registration)
      
      // Force check for updates periodically
      setInterval(() => {
        console.log('Manually checking for service worker updates...')
        registration.update()
      }, 60000) // Check every minute for testing
    },
    cached () {
      console.log('Content has been cached for offline use.')
    },
    updatefound (registration) {
      console.log('New content is downloading.', registration)
      console.log('Service worker state:', registration.installing?.state)
    },
    updated (registration) {
      console.log('New content is available; please refresh.')
      console.log('Dispatching swUpdated event with registration:', registration)
      // alert('Nova versió disponible. Recarrega la página fent Ctrl+F5.')
      // setTimeout(() => window.location.reload(true), 700)
      document.dispatchEvent(
        new CustomEvent('swUpdated', { detail: registration })
      )
    },
    offline () {
      console.log('No internet connection found. App is running in offline mode.')
    },
    error (error) {
      console.error('Error during service worker registration:', error)
    }
  })
}
