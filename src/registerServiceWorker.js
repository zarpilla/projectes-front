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
      console.log('App is being served from cache by a service worker.')
      console.log('Service worker is ready and controlling this page')
    },
    registered (registration) {
      console.log('Service worker has been registered.', registration)
      
      // Wait a bit before starting periodic updates to let the SW finish installing
      setTimeout(() => {
        console.log('Starting periodic update checks...')
        setInterval(() => {
          console.log('Manually checking for service worker updates...')
          if (registration && typeof registration.update === 'function') {
            registration.update().catch(error => {
              console.warn('Manual update check failed:', error.message)
            })
          }
        }, 60000) // Check every minute for testing
      }, 5000) // Wait 5 seconds after registration
    },
    cached () {
      console.log('Content has been cached for offline use.')
      console.log('Service worker is now active and caching content')
    },
    updatefound (registration) {
      console.log('New content is downloading.', registration)
      const installingWorker = registration.installing
      if (installingWorker) {
        console.log('Service worker state:', installingWorker.state)
        
        installingWorker.addEventListener('statechange', () => {
          console.log('Service worker state changed to:', installingWorker.state)
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('New service worker installed, update available')
              // Dispatch the update event here as a backup
              document.dispatchEvent(
                new CustomEvent('swUpdated', { detail: registration })
              )
            } else {
              console.log('Service worker installed for the first time')
            }
          } else if (installingWorker.state === 'redundant') {
            console.warn('Service worker became redundant - this might indicate an installation failure')
          } else if (installingWorker.state === 'activated') {
            console.log('Service worker activated successfully')
          }
        })
      }
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
  
  // Global fallback for old service workers that don't dispatch the event
  setTimeout(() => {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          if (registration.waiting) {
            console.log('Fallback: Found waiting service worker, dispatching update event')
            document.dispatchEvent(
              new CustomEvent('swUpdated', { detail: registration })
            )
          }
        })
      })
    }
  }, 10000) // Check after 10 seconds
}
