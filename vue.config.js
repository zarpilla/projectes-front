module.exports = {
  publicPath: process.env.DEPLOY_ENV === 'GH_PAGES'
    ? '/admin-one-vue-bulma-dashboard/'
    : '/',

  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.postcss$/,
          use: [ 'postcss-loader' ]
        }
      ]
    }
  }
}
