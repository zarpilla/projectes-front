<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section">
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
