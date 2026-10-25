// Runtime config the app normally gets from public/config.js
window.APP_CONFIG = {
  VUE_APP_API_URL: 'http://api.test',
  VUE_APP_RESET_PASSWORD: 'http://app.test/reset-password',
  VUE_APP_PATH: '/'
}

// Unmount every wrapper after its test: a screen left mounted kept its timers
// (the jQuery wait) running until the environment was gone, «window is not
// defined» as an unhandled error that failed the run (issues/305)
import { afterEach } from 'vitest'
import { enableAutoUnmount } from '@vue/test-utils'
enableAutoUnmount(afterEach)
