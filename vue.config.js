module.exports = {
  publicPath: process.env.DEPLOY_ENV === 'GH_PAGES'
    ? '/esstrapis/'
    : process.env.NODE_ENV === 'production' && process.env.VUE_APP_DOCKER 
      ? '/' 
      : '/stats',

  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.postcss$/,
          use: [ 'postcss-loader' ]
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
        // skipWaiting: true
    }
  }
}
