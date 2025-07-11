module.exports = {
  publicPath: process.env.DEPLOY_ENV === 'GH_PAGES'
    ? '/esstrapis/'
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
