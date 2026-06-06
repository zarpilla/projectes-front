<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <admin-user-list />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar';
import AdminUserList from '@/components/AdminUserList';

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
