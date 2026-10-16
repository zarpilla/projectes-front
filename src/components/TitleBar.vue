<template>
  <!-- Page head of the redesign: the last entry of titleStack is the page title,
       the ones before it a breadcrumb. Optional subtitle and actions (default slot). -->
  <section class="section is-title-bar">
    <nav v-if="crumbs.length" class="crumbs" aria-label="Ruta">
      <template v-for="(crumb, index) in crumbs" :key="index">
        <span v-if="index > 0" aria-hidden="true">/</span>
        <span>{{ crumb }}</span>
      </template>
    </nav>
    <div class="title-row">
      <div class="title-text">
        <h1>{{ title }}</h1>
        <div v-if="subtitle || $slots.subtitle" class="subtitle-line">
          <slot name="subtitle">{{ subtitle }}</slot>
        </div>
      </div>
      <div v-if="$slots.default" class="title-actions">
        <slot />
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'TitleBar',
  props: {
    titleStack: {
      type: Array,
      default: () => []
    },
    subtitle: {
      type: String,
      default: ''
    }
  },
  computed: {
    title () {
      return this.titleStack.length ? this.titleStack[this.titleStack.length - 1] : ''
    },
    crumbs () {
      return this.titleStack.slice(0, -1)
    }
  }
}
</script>
