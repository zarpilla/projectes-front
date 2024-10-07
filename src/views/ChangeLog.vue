<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
      <card-component title="2024.09.19">
        <div class="item mb-4">
          <span class="tag is-warning">Millores</span>
          <div class="text mt-2">
            Millora en la velocitat de càrrega del calendari de <router-link to="/dedicacio">dedicacions.</router-link>
          </div>
        </div>
      </card-component>
      <card-component title="2024.10.07">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Filtre múltiple d'estats de projectes a 
            <router-link to="/stats-economic-detail">Detall d'ingressos i despeses</router-link>, 
            <router-link to="/tresoreria">Tresoreria</router-link> i
            <router-link to="/forecast">Previsió Econòmica</router-link>.
          </div>
        </div>
      </card-component>
      <card-component title="2024.09.06">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Es permet l'entrada d'hores dedicades a projectes des del registre de jornades.
          </div>
          <div class="text mt-2">
            Nous camps de tipus de contacte, import aportació i data de seguiment a la fitxa de contacte.
          </div>
        </div>
        <div class="item mb-4">
          <span class="tag is-warning">Millores</span>
          <div class="text mt-2">
            Petites correccions a la vista mòbil d'entrada d'hores dedicades.
          </div>
        </div>
      </card-component>
      <card-component title="2024.06.28">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Canvi de nom, a partir d'ara: <b>ESS</b>TRAPIS
          </div>
        </div>
      </card-component>
      <card-component title="2024.06.11">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Nou camp d'<b>Hores previstes avui</b> a la <router-link to="/stats-previsio-hores">taula dinámica de dedicació</router-link>.
          </div>
        </div>
      </card-component>
      <card-component title="2024.06.06">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Possibilitat de triar a quins estats de projecte es poden assignar hores, no només a actius.
          </div>
          <div class="text mt-2">
            Camp subvencionable a <router-link to="/stats-economic-detail"> taula dinàmica d'ingressos i despeses.</router-link>
          </div>
          <div class="text mt-2">
            Nous camps al <router-link to="/grants"> llistat de subvencions.</router-link>
          </div>
        </div>
      </card-component> 
      <card-component title="2024.05.31">
        <div class="item mb-4">
          <span class="tag is-warning">Millores</span>
          <div class="text mt-2">
            Millores en la importació d'hores des de calendaris .ics amb claudàtors.
          </div>          
        </div>
      </card-component> 
      <card-component title="2024.05.30">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Filtres a la taula de <router-link to="/contacts">contactes</router-link>.
          </div>          
        </div>
        <div class="item mb-4">
          <div class="text mt-2">
            Nous camps per a subvencions a la fitxa de projecte: Número d'expedient, Entitat líder i Agrupada.
          </div>          
        </div>
        <div class="item mb-4">
          <div class="text mt-2">
            Data de previsió de cobrament a factures i ingressos
          </div>          
        </div>        
      </card-component> 
      <card-component title="2024.05.27">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Nou mòdul (experimental) per al càlcul del <router-link to="/price-hour">preu/hora</router-link> dels serveis.
          </div>          
        </div>
      </card-component>       
      <card-component title="2024.05.15">
        <div class="item mb-4">
          <span class="tag is-primary">Novetats</span>
          <div class="text mt-2">
            Possibilitat de visualització de <router-link to="/tresoreria">tresoreria</router-link> per anys.
          </div>          
        </div>
      </card-component> 
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
