/* eslint-disable no-console */

import { register } from 'register-service-worker'

if (process.env.NODE_ENV === 'production') {
  const swPath = `${process.env.BASE_URL}service-worker.js`
  console.log('Registering service worker at:', swPath)
  console.log('BASE_URL:', process.env.BASE_URL)
  
  // First, let's check if the service worker file exists
  fetch(swPath, { method: 'HEAD' })
    .then(response => {
      console.log('Service worker file check - Status:', response.status)
      console.log('Service worker file check - Headers:', [...response.headers.entries()])
      if (!response.ok) {
        console.error('Service worker file not found or not accessible')
      }
    })
    .catch(error => {
      console.error('Error checking service worker file:', error)
    })
  
  register(swPath, {
    ready () {
      console.log('ESSTRAPIS v.1.0.3 - DEBUG VERSION')
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
      console.log('Service worker state:', registration.installing && registration.installing.state)
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
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      })
      
      // Additional debugging - check if the SW file is accessible
      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          console.log('Current service worker registrations:', registrations)
        })
      }
    }
  })
}
