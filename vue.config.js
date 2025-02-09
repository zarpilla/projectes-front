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
  pwa: {
    workboxOptions: {
        // skipWaiting: true
    }
  }
}
