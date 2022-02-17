<template>
  <div class="card">
    <header v-if="title" class="card-header">
      <p class="card-header-title">
        <b-icon v-if="icon" :icon="icon" custom-size="default" />
        {{ title }}
      </p>
      <a
        v-if="headerIcon && !closeIcon"
        href="#"
        class="card-header-icon"
        aria-label="more options"
        @click.prevent="headerIconClick"
      >
        <b-icon :icon="headerIcon" custom-size="default" />
      </a>
      <a
        v-if="closeIcon"
        href="#"
        class="card-header-icon"
        aria-label="more options"
        @click.prevent="showContent"
      >
        <b-icon icon="chevron-down" custom-size="default" />
      </a>
    </header>
    <div class="card-content" :class="visible ? 'z' : 'is-hidden'">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: 'CardComponent',
  props: {
    title: {
      type: String,
      default: null
    },
    icon: {
      type: String,
      default: null
    },
    headerIcon: {
      type: String,
      default: null
    },
    closeIcon: {
      type: Boolean,
      default: true
    },
    contentVisible: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      visible: false,
    }
  },
  created() {
    this.visible = this.contentVisible
  },
  methods: {
    headerIconClick () {
      this.$emit('header-icon-click')
    },
    showContent () {
      if (this.closeIcon) {
        this.visible = !this.visible
      }
    }
  }
}
</script>
