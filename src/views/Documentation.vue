<template>
  <div>
    <title-bar :title-stack="titleStack" subtitle="El manual d'usuari: com fer servir cada part de l'aplicació." />
    <section class="section is-main-section">
      <section class="a-box docs-box">
        <header class="box-head"><h2>Manual d'usuari</h2></header>
        <p class="docs-lead">
          Com es fa servir cada pantalla, pas a pas, amb captures i un cercador. S'obre en una pestanya nova
          amb els capítols que corresponen als teus permisos.
        </p>
        <b-button type="is-primary" icon-left="book-open-variant" @click="openManual">Obre el manual</b-button>
      </section>
      <!-- The videos show the app before the redesign: hidden until they are redone. -->
      <section v-if="showVideos" class="a-box docs-box">
        <header class="box-head"><h2>Vídeos</h2></header>
        <ul class="docs-list">
          <li v-for="video in videos" :key="video.file">
            <a :href="`${base}docum/${video.file}`" target="_blank" rel="noopener">
              <b-icon icon="play-circle-outline" />
              <span>{{ video.title }}</span>
            </a>
          </li>
        </ul>
      </section>
    </section>
  </div>
</template>
<script>
import TitleBar from '@/components/TitleBar.vue'
import { openDocs, docsErrorMessage } from '@/service/docs'

export default {
  name: 'Documentation',
  components: {
    TitleBar
  },
  data () {
    return {
      base: import.meta.env.BASE_URL,
      showVideos: false,
      videos: [
        { file: '01.intro.mkv', title: 'Introducció' },
        { file: '02.01.projectes.mkv', title: 'Projectes' },
        { file: '02.02.projectes-contactes.mkv', title: 'Projectes: contactes' },
        { file: '02.03.projectes-ingressos-despeses-fases-planificacio.mkv', title: 'Projectes: fases i pressupost intern' },
        { file: '03.hores-entrada.mkv', title: "Entrada d'hores dedicades" },
        { file: '03.hores-saldo.mkv', title: "Saldo d'hores" },
        { file: '04.informacio-economica.mkv', title: "Entrada d'informació econòmica" },
        { file: '05.tresoreria.mkv', title: 'Tresoreria' },
        { file: '06.tasques.mp4', title: 'Tasques' }
      ]
    }
  },
  computed: {
    titleStack () {
      return ['Altres', 'Documentació']
    }
  },
  methods: {
    async openManual () {
      try {
        await openDocs()
      } catch (error) {
        this.$buefy.snackbar.open({ message: docsErrorMessage(error), type: 'is-danger', queue: false })
      }
    }
  }
}
</script>

<style scoped>
.docs-box {
  max-width: 40rem;
}
.docs-box + .docs-box {
  margin-top: 1rem;
}
.docs-lead {
  margin: 0 0 .75rem;
}
.docs-list {
  display: grid;
  gap: .25rem;
}
.docs-list a {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .375rem .5rem;
  border-radius: 8px;
  font-weight: 600;
}
.docs-list a:hover {
  background: var(--a-accent-soft);
}
</style>
