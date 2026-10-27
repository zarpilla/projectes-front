<template>
  <!-- The reminder of the unpaid service invoices: in the pop-up after login
       and on the members' «Avisos» (issues/181, 354) -->
  <div class="pending-invoices-text">
    Aquest missatge és per recordar-te que tens pagaments pendents de les
    factures de servei per un import total de {{ sumOfInvoices }}.
    <br /><br />T'hem enviat les factures al correu el darrer dia de mes i
    les pots consultar també a la secció de
    <router-link to="/factures-proveidor">FACTURES</router-link>
    aquí mateix a
    l'ESStrapis, on veureu indicades les que estan pendents. Aprofitem per
    recordar que per tenir un seguiment òptim de la facturació, feu una
    transferència per factura amb l'import exacte indicant al concepte: "el
    vostre nom comercial_el mes de facturació_número de factura".<br /><br />
    Si ja has fet el pagament, no en facis cas, una vegada l'informem
    deixarà d'aparèixer aquest missatge!<br /><br />
    Necessitem la responsabilitat de totes per poder facilitar la gestió i
    us recordem que les factures s'emeten a mes vençut i si acumulem
    impagaments posem en risc la tresoreria {{ ofEntity }}.
  </div>
</template>

<script>
import { mapState } from "pinia";
import { useMainStore } from "@/stores/main.js";
import { formatMoney } from "@/helpers/format-number";
import { ofWord } from "@/helpers/catalan";

export default {
  name: "PendingInvoicesText",
  props: {
    invoices: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    ...mapState(useMainStore, ["me"]),
    // «2.272,74 €» (it said «2272.74 €», issues/181)
    sumOfInvoices() {
      return formatMoney(this.invoices.reduce((acc, invoice) => acc + (Number(invoice.total) || 0), 0));
    },
    // the entity's own name, not «La Diligència» for everyone (issues/181)
    ofEntity() {
      return this.me && this.me.name ? ofWord(this.me.name) : "de l'entitat";
    }
  }
};
</script>
