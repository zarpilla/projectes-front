module.exports = {
  publicPath:
    process.env.DEPLOY_ENV === "GH_PAGES"
      ? "/esstrapis/"
      : process.env.VUE_APP_PATH,

  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.postcss$/,
          use: ["postcss-loader"]
        }
      ]
    }
  },

  css: {
    extract: {
      ignoreOrder: true
    }
  },
  pwa: {
    workboxOptions: {
      skipWaiting: true, // Force immediate updates
      clientsClaim: true, // Take control immediately
      // Exclude HTML from precaching to prevent stale HTML serving
      exclude: [/\.html$/],
      // Custom runtime caching for HTML with network-first strategy
      runtimeCaching: [
        {
          urlPattern: /\.html$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'html-cache',
            expiration: {
              maxAgeSeconds: 60, // 1 minute
              maxEntries: 10
            },
            networkTimeoutSeconds: 3
          }
        }
      ]
    }
  }
};
