<template>
  <div>
    <title-bar :title-stack="titleStack" />
    <section class="section is-main-section column is-half">
      <card-component 
        v-for="entry in changeLog" 
        :key="entry.date" 
        :title="entry.date"
      >
        <div 
          v-for="(item, index) in entry.items" 
          :key="index" 
          class="item"
          :class="{ 'mb-4': index < entry.items.length - 1 }"
        >
          <span class="tag" :class="getTagClass(item.type)">{{ item.type }}</span>
          <div class="text mt-2">
            <template v-if="typeof item.text === 'string'">
              {{ item.text }}
            </template>
            <template v-else>
              <span
                v-for="(segment, segIndex) in item.text"
                :key="segIndex"
              >
                <template v-if="typeof segment === 'string'">{{ segment }}</template>
                <router-link v-else-if="segment.to" :to="segment.to">{{ segment.label }}</router-link>
                <b v-else-if="segment.tag === 'b'">{{ segment.text }}</b>
              </span>
            </template>
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
  data() {
    return {
      changeLog: [
        {
          date: "2026.06.05",
          items: [
            {
              type: "Novetats",
              text: "Integració amb FACe per a l'enviament automàtic de factures electròniques a l'Administració Pública."
            },
            {
              type: "Novetats",
              text: "Noves pàgines d'administració per gestionar la configuració del sistema i els paràmetres globals."
            }
          ]
        },
        {
          date: "2026.05.12",
          items: [
            {
              type: "Novetats",
              text: "Nova funcionalitat per validar moviments de tresoreria reals."
            },
            {
              type: "Novetats",
              text: "Nova funcionalitat per exportar i importar contactes en format CSV."
            },
            {
              type: "Millores",
              text: ["Afegida la periodificació a la taula de ", { to: "/forecast", label: "previsió econòmica" }, "."]
            }
          ]
        },
        {
          date: "2026.04.22",
          items: [
            {
              type: "Correccions",
              text: "Correcció d'errors en esborrar hores planificades al gantt de projecte."
            },
            {
              type: "Millores",
              text: ["Possibilitat de descarregar el ", { to: "/registre-jornades", label: "registre de jornades" }, " anual."]
            }
          ]
        },
        {
          date: "2026.04.15",
          items: [
            {
              type: "Millores",
              text: "Millores en la gestió i visualització de projectes mare, amb una nova vista de llistat i una nova vista de fitxa de projecte mare."
            }
          ]
        },
        {
          date: "2026.02.15",
          items: [
            {
              type: "Novetats",
              text: "Nou assistent per passos en la creació de projectes."
            }
          ]
        },
        {
          date: "2026.02.09",
          items: [
            {
              type: "Novetats",
              text: "Possibiltat d'afegir moviments de tresoreria de saldo real per compte bancari."
            },
            {
              type: "Novetats",
              text: "Nou càlcul de previsions a partir de les fases d'execució al resum financer de projectes. Nova columna de pressupost original."
            },
            {
              type: "Millores",
              text: "Millores en l'assignació de documents a projectes: Assignació semiautomàtica i millor detecció d'imports mal assignats tenint en compte documents assignats a varis projectes."
            },
            {
              type: "Millores",
              text: "Assignació de justificacions a previsions."
            }
          ]
        },
        {
          date: "2026.02.02",
          items: [
            {
              type: "Novetats",
              text: "Nou logo"
            },
            {
              type: "Millores",
              text: "Calculs trimestrals d'IVA a tresoreria"
            }
          ]
        },
        {
          date: "2026.01.26",
          items: [
            {
              type: "Millores",
              text: "Millores en projectes mare, per calcular i visualitzar les dades dels projectes fills."
            },
            {
              type: "Millores",
              text: "Afegits filtres a tresoreria"
            },
            {
              type: "Millores",
              text: "Millores al mòdul de justificacions"
            }
          ]
        },
        {
          date: "2025.11.28",
          items: [
            {
              type: "Novetats",
              text: "Múltiples comptes bancaris"
            },
            {
              type: "Novetats",
              text: "Justificació de subvencions anual"
            },
            {
              type: "Novetats",
              text: "Nou formulari per facilitar la introducció de dietes"
            },
            {
              type: "Correccions",
              text: "Correccions a la importació d'hores a partir de calendaris"
            }
          ]
        },
        {
          date: "2025.10.07",
          items: [
            {
              type: "Novetats",
              text: "Possibilitat de desactivar àmbits de projecte."
            }
          ]
        },
        {
          date: "2025.09.18",
          items: [
            {
              type: "Novetats",
              text: "Nou camp de tipus de projecte a la fitxa de projecte."
            },
            {
              type: "Millores",
              text: "La importació de calendaris iCal permet importar esdeveniments recurrents."
            },
            {
              type: "Correccions",
              text: "Correcció de camps buits a la taula dinàmica d'ingressos i despeses."
            },
            {
              type: "Correccions",
              text: "Ja no es mostren anys 9999 en projectes amb periodificació, sempre que totes les fases tinguin dates assignades."
            }
          ]
        },
        {
          date: "2025.09.12",
          items: [
            {
              type: "Novetats",
              text: "Possibilitat de definir vistes personalitzades a les taules dinàmiques."
            },
            {
              type: "Millores",
              text: "Millores de rendiment en la visualització de dades d'ingressos i despeses i preus/hora."
            }
          ]
        },
        {
          date: "2025.08.02",
          items: [
            {
              type: "Millores",
              text: "Millores de rendiment en la visualització de factures amb més de 50 línies."
            }
          ]
        },
        {
          date: "2025.06.28",
          items: [
            {
              type: "Novetats",
              text: "Adaptació a normativa VERIFACTU."
            },
            {
              type: "Novetats",
              text: "Nova funcionalitat per crear factures rectificatives a partir de factures emeses."
            }
          ]
        },
        {
          date: "2025.02.09",
          items: [
            {
              type: "Millores",
              text: "Millores de rendiment a l'actualitzar projectes i factures."
            }
          ]
        },
        {
          date: "2024.11.26",
          items: [
            {
              type: "Novetats",
              text: ["Es permet modificar la distribució setmanal d'hores treballades a les jornades de ", { to: "/working-day", label: "persones." }]
            }
          ]
        },
        {
          date: "2024.09.19",
          items: [
            {
              type: "Correccions",
              text: ["Correcció dels saldos d'inici d'any per anys que no son l'actual a la ", { to: "/tresoreria", label: "taula de tresoreria." }]
            },
            {
              type: "Millores",
              text: ["Incorporació del camp 'projecte mare' a la taula dinàmica ", { to: "/stats-economic-detail", label: "d'ingressos i despeses." }]
            }
          ]
        },
        {
          date: "2024.10.07",
          items: [
            {
              type: "Millores",
              text: ["Millora en la velocitat de càrrega del calendari de ", { to: "/dedicacio", label: "dedicacions." }]
            }
          ]
        },
        {
          date: "2024.10.07",
          items: [
            {
              type: "Novetats",
              text: ["Filtre múltiple d'estats de projectes a ", { to: "/stats-economic-detail", label: "Detall d'ingressos i despeses" }, ", ", { to: "/tresoreria", label: "Tresoreria" }, " i ", { to: "/forecast", label: "Previsió Econòmica" }, "."]
            }
          ]
        },
        {
          date: "2024.09.06",
          items: [
            {
              type: "Novetats",
              text: "Es permet l'entrada d'hores dedicades a projectes des del registre de jornades."
            },
            {
              type: "Novetats",
              text: "Nous camps de tipus de contacte, import aportació i data de seguiment a la fitxa de contacte."
            },
            {
              type: "Millores",
              text: "Petites correccions a la vista mòbil d'entrada d'hores dedicades."
            }
          ]
        },
        {
          date: "2024.06.28",
          items: [
            {
              type: "Novetats",
              text: ["Canvi de nom, a partir d'ara: ", { tag: "b", text: "ESS" }, "TRAPIS"]
            }
          ]
        },
        {
          date: "2024.06.11",
          items: [
            {
              type: "Novetats",
              text: ["Nou camp d'", { tag: "b", text: "Hores previstes avui" }, " a la ", { to: "/stats-previsio-hores", label: "taula dinámica de dedicació" }, "."]
            }
          ]
        },
        {
          date: "2024.06.06",
          items: [
            {
              type: "Novetats",
              text: "Possibilitat de triar a quins estats de projecte es poden assignar hores, no només a actius."
            },
            {
              type: "Novetats",
              text: ["Camp subvencionable a ", { to: "/stats-economic-detail", label: "taula dinàmica d'ingressos i despeses." }]
            },
            {
              type: "Novetats",
              text: ["Nous camps al ", { to: "/grants", label: "llistat de subvencions." }]
            }
          ]
        },
        {
          date: "2024.05.31",
          items: [
            {
              type: "Millores",
              text: "Millores en la importació d'hores des de calendaris .ics amb claudàtors."
            }
          ]
        },
        {
          date: "2024.05.30",
          items: [
            {
              type: "Novetats",
              text: ["Filtres a la taula de ", { to: "/contacts", label: "contactes" }, "."]
            },
            {
              type: "Novetats",
              text: "Nous camps per a subvencions a la fitxa de projecte: Número d'expedient, Entitat líder i Agrupada."
            },
            {
              type: "Novetats",
              text: "Data de previsió de cobrament a factures i ingressos"
            }
          ]
        },
        {
          date: "2024.05.27",
          items: [
            {
              type: "Novetats",
              text: ["Nou mòdul (experimental) per al càlcul del ", { to: "/price-hour", label: "preu/hora" }, " dels serveis."]
            }
          ]
        },
        {
          date: "2024.05.15",
          items: [
            {
              type: "Novetats",
              text: ["Possibilitat de visualització de ", { to: "/tresoreria", label: "tresoreria" }, " per anys."]
            }
          ]
        },
        {
          date: "2024.05.06",
          items: [
            {
              type: "Correccions",
              text: ["Corregits colors de les ", { to: "/dedicacio-charts", label: "gràfiques de dedicació" }, ", que en alguns casos no corresponia amb la llegenda."]
            }
          ]
        },
        {
          date: "2024.04.30",
          items: [
            {
              type: "Novetats",
              text: 'Camp "CCC" a l\'organització. Camp "NAF" (número d\'afiliació a la SS) a les persones. Camp "Despeses indirectes" a la secció de subvencions dels projectes.'
            },
            {
              type: "Novetats",
              text: "Check múltiple de canvi de'stat al mòdul de comandes i logística. Algunes correccions i millores."
            }
          ]
        },
        {
          date: "2024.04.18",
          items: [
            {
              type: "Novetats",
              text: "Nou mòdul de comandes i logística."
            }
          ]
        },
        {
          date: "2024.04.16",
          items: [
            {
              type: "Novetats",
              text: "Previsions de tresoreria d'IVA amb prorata."
            },
            {
              type: "Novetats",
              text: ["Totals per dia a ", { to: "/registre-jornades", label: "registre de jornades" }, "."]
            },
            {
              type: "Novetats",
              text: "Els ingressos i despeses es guarden amb la seva corresponent prorrata d'IVA al saldar-se."
            }
          ]
        },
        {
          date: "2024.03.27",
          items: [
            {
              type: "Novetats",
              text: ["Generació de PDFs de ", { to: "/registre-jornades", label: "registre de jornades" }, " per mesos."]
            },
            {
              type: "Novetats",
              text: ["Filtre de cobrat/pagat a ", { to: "/emitted-invoices", label: "ingressos" }, " i ", { to: "/received-invoices", label: "despeses" }, "."]
            },
            {
              type: "Novetats",
              text: "Subtotals per fases al detall de projectes."
            },
            {
              type: "Novetats",
              text: ["Filtre de projectes actius i tancats al ", { to: "/stats-economic-detail", label: "detall d'ingressos i despeses" }, "."]
            },
            {
              type: "Novetats",
              text: "Afegida data de justificació als projectes subvencionables."
            },
            {
              type: "Correccions",
              text: "Solucionat error amb l'importació de calendaris .ics"
            }
          ]
        },
        {
          date: "2024.03.21",
          items: [
            {
              type: "Novetats",
              text: "Enviament de factures de clientes per correu electrònic."
            },
            {
              type: "Novetats",
              text: ["Funcionalitat per saldar l'IVA amb prorrata a ", { to: "/tresoreria", label: "tresoreria" }, "."]
            },
            {
              type: "Novetats",
              text: ["Camp de número de factura de proveïdora al llistat de ", { to: "/received-invoices", label: "despeses" }, "."]
            },
            {
              type: "Novetats",
              text: ["Generació de PDFs de ", { to: "/registre-jornades", label: "registre de jornades" }, "."]
            },
            {
              type: "Millores",
              text: "Es permet definir un calendari (en format .ical) per a tota l'organització per tal d'importar automàticament dedicacions, a part de tenir calendaris per persona com fins ara."
            }
          ]
        },
        {
          date: "2024.01.10",
          items: [
            {
              type: "Novetats",
              text: "Nova secció de registre de canvis (aquesta)."
            },
            {
              type: "Novetats",
              text: ["El mòdul de ", { to: "/justifications", label: "justificacions" }, " es pot consultar també en funció de les hores previstes, a més a més de les reals."]
            },
            {
              type: "Correccions",
              text: ["A les ", { to: "/working-day", label: "jornades de persones" }, ", s'agafa l'últim dia del més com a data final en nous períodes."]
            }
          ]
        }
      ]
    };
  },
  computed: {
    titleStack() {
      return ["Registre de canvis"];
    }
  },
  methods: {
    getTagClass(type) {
      const tagClasses = {
        'Novetats': 'is-primary',
        'Millores': 'is-warning',
        'Correccions': 'is-danger'
      };
      return tagClasses[type] || '';
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
