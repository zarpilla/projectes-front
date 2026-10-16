<template>
  <div>
    <!-- the page head lives in AdminUserForm (name, state and summary of the user) -->
    <admin-user-form :user-id="id" />
  </div>
</template>

<script>
import AdminUserForm from '@/components/AdminUserForm.vue';

export default {
  name: 'AdminUserFormView',
  components: {
    AdminUserForm
  },
  props: {
    id: {
      type: String,
      default: null
    }
  }
};
</script>
