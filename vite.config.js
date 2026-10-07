import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'VUE_APP_'])

  return {
    // Served under /stats/ (VUE_APP_PATH, same variable the Dockerfile and CI pass)
    base: env.VUE_APP_PATH || '/',
    plugins: [vue()],
    // Keep the existing VUE_APP_* names (.env, Dockerfile, CI) readable as
    // import.meta.env.VUE_APP_*
    envPrefix: ['VITE_', 'VUE_APP_'],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          // deprecations inside Bulma/Buefy sources aren't ours to fix; our own
          // partials' @import warnings stay visible
          quietDeps: true
        }
      }
    },
    server: {
      port: 8080,
      strictPort: true
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 4000
    }
  }
})
