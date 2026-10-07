module.exports = {
  publicPath:
    process.env.DEPLOY_ENV === "GH_PAGES"
      ? "/stats/"
      : process.env.VUE_APP_PATH,

  // Transpile dhtmlx-gantt to support optional chaining
  transpileDependencies: [
    'dhtmlx-gantt'
  ],

  configureWebpack: {
    plugins: [
      // vue-loader 15 (Vue 2) imports a default export from every <style> block,
      // which mini-css-extract-plugin modules don't have. Harmless; gone with
      // vue-loader 17 on Vue 3. Filtered here rather than with `ignoreWarnings`
      // because Vue CLI's reporter reads compilation.warnings directly.
      {
        apply (compiler) {
          compiler.hooks.afterCompile.tap('IgnoreVue2StyleExportWarnings', compilation => {
            compilation.warnings = compilation.warnings.filter(
              w => !/export 'default' \(imported as 'style\d+'\) was not found/.test(w.message)
            )
          })
        }
      }
    ]
  },

  devServer: {
    client: {
      // webpack-dev-server 4 also overlays uncaught runtime errors, which Vue CLI 4
      // didn't; the app has a few pre-existing unhandled rejections (e.g. on the
      // login page) that would cover the UI. Compile errors still show.
      overlay: { errors: true, warnings: false, runtimeErrors: false }
    }
  },

  css: {
    extract: {
      ignoreOrder: true
    },
    loaderOptions: {
      sass: {
        sassOptions: {
          // Bulma 0.9 / Buefy 0.9 sources trigger Dart Sass deprecations we
          // can't fix; our own SCSS is still reported (moves to Bulma 1 later)
          quietDeps: true,
          silenceDeprecations: ['legacy-js-api']
        }
      }
    }
  }
};
