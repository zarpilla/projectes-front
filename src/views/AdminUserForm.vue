<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <admin-user-form :user-id="id" />
  </div>
</template>

<script>
import TitleBar from '@/components/TitleBar';
import AdminUserForm from '@/components/AdminUserForm';

export default {
  name: 'AdminUserFormView',
  components: {
    TitleBar,
    AdminUserForm
  },
  props: {
    id: {
      type: String,
      default: null
    }
  },
  computed: {
    titleStack() {
      const base = ['Administració', 'Usuaris'];
      if (this.id) {
        base.push('Editar');
      } else {
        base.push('Crear');
      }
      return base;
    }
  }
};
</script>
