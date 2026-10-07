// Vue 3 migration guard: only the eslint-plugin-vue rules for APIs that Vue 3
// removes or changes, kept separate from the (still disabled) style lint.
//   npm run lint:vue3
// "error" rules are already fixed on the Vue 2 code and must stay fixed;
// "warn" rules are the remaining worklist for the Vue 3 switch.
module.exports = {
  root: true,
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: 'babel-eslint',
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['vue'],
  rules: {
    'vue/no-deprecated-data-object-declaration': 'error',
    'vue/no-deprecated-dollar-listeners-api': 'error',
    'vue/no-deprecated-dollar-scopedslots-api': 'error',
    'vue/no-deprecated-events-api': 'error',
    'vue/no-deprecated-filter': 'error',
    'vue/no-deprecated-functional-template': 'error',
    'vue/no-deprecated-html-element-is': 'error',
    'vue/no-deprecated-inline-template': 'error',
    'vue/no-deprecated-props-default-this': 'error',
    'vue/no-deprecated-scope-attribute': 'error',
    'vue/no-deprecated-slot-attribute': 'error',
    'vue/no-deprecated-slot-scope-attribute': 'error',
    'vue/no-deprecated-v-on-number-modifiers': 'error',
    'vue/no-deprecated-vue-config-keycodes': 'error',
    'vue/no-custom-modifiers-on-v-model': 'error',
    'vue/no-lifecycle-after-await': 'error',
    'vue/no-watch-after-await': 'error',
    'vue/require-toggle-inside-transition': 'error',
    'vue/valid-v-slot': 'error',

    'vue/no-deprecated-destroyed-lifecycle': 'warn',
    'vue/no-deprecated-v-bind-sync': 'warn',
    'vue/no-deprecated-v-on-native-modifier': 'warn',
    'vue/no-v-for-template-key-on-child': 'warn'
  }
}
