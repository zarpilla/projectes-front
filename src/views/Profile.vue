<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <hero-bar>
      Profile
      <template #right>
        <router-link to="/" class="button">
          Dashboard
        </router-link>
      </template>
    </hero-bar>
    <section class="section is-main-section">
      <tiles>
        <profile-update-form class="tile is-child" />
        <card-component title="Profile" icon="account" class="tile is-child">
          <user-avatar class="image has-max-width is-aligned-center" />
          <hr />
          <b-field label="Name">
            <b-input :model-value="userName" custom-class="is-static" readonly />
          </b-field>
          <hr />
          <b-field label="E-mail">
            <b-input :model-value="userEmail" custom-class="is-static" readonly />
          </b-field>
        </card-component>
      </tiles>
      <password-update-form />
    </section>
  </div>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main.js'
import CardComponent from '@/components/CardComponent.vue'
import TitleBar from '@/components/TitleBar.vue'
import HeroBar from '@/components/HeroBar.vue'
import ProfileUpdateForm from '@/components/ProfileUpdateForm.vue'
import PasswordUpdateForm from '@/components/PasswordUpdateForm.vue'
import Tiles from '@/components/Tiles.vue'
import UserAvatar from '@/components/UserAvatar.vue'
export default {
  name: 'Profile',
  components: {
    UserAvatar,
    Tiles,
    PasswordUpdateForm,
    ProfileUpdateForm,
    HeroBar,
    TitleBar,
    CardComponent
  },
  computed: {
    titleStack () {
      return ['Admin', 'Profile']
    },
    ...mapState(useMainStore, ['userName', 'userEmail'])
  }
}
</script>
