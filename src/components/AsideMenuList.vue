<template>
  <ul :class="{ 'menu-list': !isSubmenuList }">
    <aside-menu-item
      v-for="(item, index) in menu"
      :key="index"
      :item="item"
      :is-collapsed="isCollapsed"
      @menu-click="menuClick"
    />
  </ul>
</template>

<script>
import AsideMenuItem from '@/components/AsideMenuItem.vue'
import { mapState } from "pinia"
import { useMainStore } from "@/stores/main.js";
import service from "@/service/index";

export default {
  name: 'AsideMenuList',
  emits: ["menu-click"],
  components: {
    AsideMenuItem
  },
  props: {
    isSubmenuList: {
      type: Boolean,
      default: false
    },
    isCollapsed: {
      type: Boolean,
      default: false
    },
    menu: {
      type: Array,
      default: () => []
    }
  },  
  async mounted() {
    // const me = await service({ requiresAuth: true, cached: true }).get("me")    
  },
  methods: {
    menuClick (item) {
      this.$emit('menu-click', item)
    }
  }
}
</script>
