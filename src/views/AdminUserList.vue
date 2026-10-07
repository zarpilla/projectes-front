<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <admin-user-list />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar.vue';
import AdminUserList from '@/components/AdminUserList.vue';

export default {
  name: 'AdminUserListView',
  components: {
    TitleBar,
    AdminUserList
  },
  computed: {
    titleStack() {
      return ['Administració', 'Usuaris'];
    }
  }
};
</script>
