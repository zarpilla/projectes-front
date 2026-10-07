<script>
import { h, Fragment, Comment } from 'vue'
import chunk from 'lodash/chunk'

// Vue 3 hands v-for children over as a Fragment and v-if="false" ones as a
// Comment; Vue 2's $slots.default was already the flat list of elements
function flatten (vnodes) {
  return vnodes.flatMap(vnode => {
    if (vnode.type === Fragment) return flatten(vnode.children)
    if (vnode.type === Comment) return []
    return [vnode]
  })
}

export default {
  name: 'Tiles',
  props: {
    maxPerRow: {
      type: Number,
      default: 5
    }
  },
  methods: {
    renderAncestor (elements) {
      return h(
        'div',
        { class: 'tile is-ancestor' },
        elements.map((element) => {
          return h('div', { class: 'tile is-parent' }, [element])
        })
      )
    }
  },
  render () {
    if (!this.$slots.default) {
      return
    }
    const elements = flatten(this.$slots.default())
    if (elements.length <= this.maxPerRow) {
      return this.renderAncestor(elements)
    } else {
      return h(
        'div',
        { class: 'is-tiles-wrapper' },
        chunk(elements, this.maxPerRow).map((group) => {
          return this.renderAncestor(group)
        })
      )
    }
  }
}
</script>
