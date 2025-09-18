// Configuration utility for getting runtime environment variables
// This allows the app to use different configurations without rebuilding

function getConfig() {
  // Try to get runtime config from window.APP_CONFIG (injected by Docker)
  if (window.APP_CONFIG) {
    return window.APP_CONFIG;
  }

  // Fallback to process.env (for development)
  return {
    VUE_APP_API_URL: process.env.VUE_APP_API_URL || 'http://localhost:1337',
    VUE_APP_RESET_PASSWORD: process.env.VUE_APP_RESET_PASSWORD || 'http://localhost:8080/#/reset-password',
    VUE_APP_PATH: process.env.VUE_APP_PATH || 'http://localhost:8080/',
    VUE_APP_DEFAULT_PROJECT_STATE: process.env.VUE_APP_DEFAULT_PROJECT_STATE || '1'
  };
}

export default getConfig;
