<template>
  <div>
    <!-- the page head lives in AdminUserList (its counts and actions) -->
    <admin-user-list />
  </div>
</template>

<script>
import AdminUserList from '@/components/AdminUserList.vue';

export default {
  name: 'AdminUserListView',
  components: {
    AdminUserList
  }
};
</script>
