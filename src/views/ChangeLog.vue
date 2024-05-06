<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component title="2024.05.06">
        <div class="item mb-4">
          <span class="tag is-danger">Correccions</span>
          <div class="text mt-2">
            Corregits colors de les <router-link to="/dedicacio-charts">gràfiques de dedicació</router-link>, que en alguns casos no corresponia amb la llegenda.
          </div>          
        </div>
      </card-component> 
      <card-component title="2024.04.30">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Camp "CCC" a l'organització. Camp "NAF" (número d'afiliació a la SS) a les persones. Camp "Despeses indirectes" a la secció de subvencions dels projectes.
          </div>          
        </div>
        <div class="item mb-4">
          <div class="text mt-2">
            Check múltiple de canvi de'stat al mòdul de comandes i logística. Algunes correccions i millores.
          </div>          
        </div>
      </card-component> 
      <card-component title="2024.04.18">
        <div class="item mb-4">          
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Nou mòdul de comandes i logística.
          </div>          
        </div>
      </card-component> 
      <card-component title="2024.04.16">
        <div class="item mb-4">          
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Previsions de tresoreria d'IVA amb prorata.
          </div>
          <div class="text mt-2">
            Totals per dia a
            <router-link to="/registre-jornades"
              >registre de jornades</router-link
            >.
          </div>          
          <div class="text mt-2">
            Els ingressos i despeses es guarden amb la seva corresponent prorrata d'IVA al saldar-se.            
          </div>          
        </div>
      </card-component>      
      <card-component title="2024.03.27">
        <div class="item mb-4">          
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Generació de PDFs de
            <router-link to="/registre-jornades"
              >registre de jornades</router-link
            > per mesos.
          </div>
          <div class="text mt-2">
            Filtre de cobrat/pagat a <router-link to="/emitted-invoices">ingressos</router-link> i
            <router-link to="/received-invoices">despeses</router-link>.
          </div>
          <div class="text mt-2">
            Subtotals per fases al detall de projectes.
          </div>
          <div class="text mt-2">
            Filtre de projectes actius i tancats al <router-link to="/stats-economic-detail">detall d'ingressos i despeses</router-link>.
          </div>
          <div class="text mt-2">
            Afegida data de justificació als projectes subvencionables.
          </div>
          <span class="tag is-danger mt-3">Correccions</span>
          <div class="text mt-2">
            Solucionat error amb l'importació de calendaris .ics
          </div>
        </div>
      </card-component>
      <card-component title="2024.03.21">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Enviament de factures de clientes per correu electrònic.
          </div>
          <div class="text mt-2">
            Funcionalitat per saldar l'IVA amb prorrata a
            <router-link to="/tresoreria">tresoreria</router-link>.
          </div>
          <div class="text mt-2">
            Camp de número de factura de proveïdora al llistat de
            <router-link to="/received-invoices">despeses</router-link>.
          </div>
          <div class="text mt-2">
            Generació de PDFs de
            <router-link to="/registre-jornades"
              >registre de jornades</router-link
            >.
          </div>
          <span class="tag is-warning mt-3">Millores</span>
          <div class="text mt-2">
            Es permet definir un calendari (en format .ical) per a tota l'organització per tal d'importar automàticament dedicacions, a part de tenir calendaris per persona com fins ara.
          </div>
        </div>
      </card-component>

      <card-component title="2024.01.10">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Nova secció de registre de canvis (aquesta).
          </div>
          <div class="text mt-2">
            El mòdul de
            <router-link to="/justifications">justificacions</router-link> es
            pot consultar també en funció de les hores previstes, a més a més de
            les reals.
          </div>
        </div>

        <div class="item">
          <span class="tag is-danger">Correccions</span>
          <div class="text mt-2">
            A les
            <router-link to="/working-day">jornades de persones</router-link>,
            s'agafa l'últim dia del més com a data final en nous períodes.
          </div>
        </div>
      </card-component>
    </section>
  </div>
</template>
<script>
import TitleBar from "@/components/TitleBar";
import CardComponent from "@/components/CardComponent";
export default {
  name: "ChangeLog",
  components: {
    CardComponent,
    TitleBar
  },
  computed: {
    titleStack() {
      return ["Registre de canvis"];
    }
  }
};
</script>
<style scoped>
ul {
  list-style: disc;
  margin-left: 0.5rem;
}
</style>
