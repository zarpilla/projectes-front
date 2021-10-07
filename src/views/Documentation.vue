<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component title="Vídeos">
          <ul>
              <li><a href="/stats/docum/01.intro.mkv" target="_blank">01. Introducció</a></li>
              <li><a href="/stats/docum/02.01.projectes.mkv" target="_blank">02.01. Projectes</a></li>
              <li><a href="/stats/docum/02.02.projectes-contactes.mkv" target="_blank">02.02. Projectes: Contactes</a></li>
              <li><a href="/stats/docum/02.03.projectes-ingressos-despeses-fases-planificacio.mkv" target="_blank">02.03. Projectes: Fases i pressupost intern</a></li>
              <li><a href="/stats/docum/03.hores-entrada.mkv" target="_blank">03. Entrada d'hores dedicades</a></li>
              <li><a href="/stats/docum/03.hores-saldo.mkv" target="_blank">04. Saldo d'hores</a></li>
          </ul>
      </card-component>
    </section>
  </div>
</template>
<script>
import TitleBar from '@/components/TitleBar'
import CardComponent from '@/components/CardComponent'
export default {
  name: 'Documentation',
  components: {
    CardComponent,
    TitleBar
  },
  computed: {
    titleStack () {
      return ['Ajuda', 'Documentació']
    }
  }
}
</script>
