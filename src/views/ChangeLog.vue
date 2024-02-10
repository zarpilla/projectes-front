<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component title="20240110">        
        <div class="item mb-4">
          <span class="tag is-primary">Novetat</span>
          <div class="text mt-2">
            Nova secció de registre de canvis (aquesta).
          </div>
        </div>

        <div class="item mb-4">
          <span class="tag is-primary">Novetat</span>
          <div class="text mt-2">
            El mòdul de <router-link to="/justifications">justificacions</router-link> es pot consultar també en funció de les hores previstes, a més a més de les reals.
          </div>
        </div>

        <div class="item">
          <span class="tag is-danger">Correcció</span>
          <div class="text mt-2">
            A les <router-link to="/working-day">jornades de persones</router-link>, s'agafa l'últim dia del més com a data final en nous períodes.
          </div>
          
        </div>        

      </card-component>
    </section>
  </div>
</template>
<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
export default {
  name: 'ChangeLog',
  components: {
    CardComponent,
    TitleBar
  },
  computed: {
    titleStack () {
      return ['Registre de canvis']
    }
  }
}
</script>
<style scoped>
ul{
    list-style: disc;
    margin-left: 0.5rem;
}
</style>
