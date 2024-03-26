<template>
  <ul :class="{ 'menu-list': !isSubmenuList }">
    <aside-menu-item
      v-for="(item, index) in menu"
      :key="index"
      :item="item"
      @menu-click="menuClick"
    />
  </ul>
</template>

<script>
import AsideMenuItem from '@/components/AsideMenuItem'
import { mapState } from "vuex";
import service from "@/service/index";

export default {
  name: 'AsideMenuList',
  components: {
    AsideMenuItem
  },
  props: {
    isSubmenuList: {
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
      this.$emit('menu-click', item)
    }
  }
}
</script>
