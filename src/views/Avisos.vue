<template>
  <!-- The members' board (issues/354, 355): where a member lands after login.
       The unpaid invoices, the routes the office has closed in the coming days
       with their reason and substitute route, and the year's holidays. -->
  <div class="avisos">
    <title-bar :title-stack="['Logística', 'Avisos']" subtitle="Rutes tancades, rutes alternatives i festius dels propers dies." />

    <section class="section is-main-section">
      <b-loading :is-full-page="false" :model-value="isLoading" />

      <div v-if="!isLoading" class="board">
        <!-- unpaid invoices -->
        <section v-if="invoices.length" class="a-box is-alert" data-test="pending-invoices">
          <header class="box-head"><h2>Hola {{ userName }}</h2></header>
          <pending-invoices-text :invoices="invoices" />
        </section>

        <!-- the coming days -->
        <section class="a-box" data-test="board-days">
          <header class="box-head">
            <h2>Propers {{ DAYS }} dies</h2>
          </header>
          <p v-if="!coming.length" class="box-help">Cap ruta tancada ni cap festiu en els propers {{ DAYS }} dies.</p>
          <ul v-else class="day-list">
            <li v-for="day in coming" :key="day.date" class="day-item" :class="{ 'is-soon': isSoon(day.date) }">
              <div class="day-head">
                <b>{{ longDay(day.date) }}</b>
                <span v-if="day.holiday" class="tag is-warning is-light">Festiu</span>
              </div>
              <ul v-if="day.closures.length" class="closure-list">
                <li v-for="c in day.closures" :key="c.id">
                  <span>{{ closureLine(c) }}</span>
                  <span v-if="c.reason" class="reason">{{ c.reason }}</span>
                  <span v-if="substituteOf(c)" class="substitute" data-test="substitute">
                    <b-icon icon="arrow-right" size="is-small" />
                    Envia les comandes a <b>{{ routeName(substituteOf(c).route) }}</b>, {{ dayText(substituteOf(c).date) }}<template v-if="!substituteOpen(substituteOf(c).date)"> (la podràs triar des del {{ shortDay(openFrom(substituteOf(c).date)) }})</template>.
                  </span>
                </li>
              </ul>
              <p v-else class="box-help">Les rutes funcionen amb normalitat.</p>
            </li>
          </ul>
        </section>

        <!-- the year's holidays -->
        <section class="a-box">
          <header class="box-head"><h2>Festius de {{ year }}</h2></header>
          <p v-if="!yearHolidays.length" class="box-help">No hi ha més festius aquest any.</p>
          <ul v-else class="holiday-list">
            <li v-for="h in yearHolidays" :key="h.date">
              <b>{{ longDay(h.date) }}</b>
              <span class="box-help">{{ h.closed ? `${h.closed} ${h.closed === 1 ? "ruta tancada" : "rutes tancades"}` : "Cap ruta tancada encara" }}</span>
            </li>
          </ul>
        </section>
      </div>
    </section>
  </div>
</template>

<script>
import moment from "moment";
import { mapState } from "pinia";
import service from "@/service/index";
import TitleBar from "@/components/TitleBar.vue";
import PendingInvoicesText from "@/components/PendingInvoicesText.vue";
import { useMainStore } from "@/stores/main.js";
import { boardDays, substituteOf, substituteOpen, SUBSTITUTE_DAYS_BEFORE } from "@/domain/routeClosures.js";

const DAYS = 30;
const routeName = r => (r && (r.short_name || r.name)) || "";

export default {
  name: "Avisos",
  components: { TitleBar, PendingInvoicesText },
  data() {
    return {
      DAYS,
      isLoading: true,
      invoices: [],
      closures: [],
      holidays: [],
      today: moment().format("YYYY-MM-DD"),
      year: moment().year()
    };
  },
  computed: {
    ...mapState(useMainStore, ["userName", "me"]),
    coming() {
      return boardDays({ closures: this.closures, holidays: this.holidays, today: this.today, days: DAYS });
    },
    yearHolidays() {
      const end = `${this.year}-12-31`;
      return this.holidays
        .filter(d => d >= this.today && d <= end)
        .map(date => ({ date, closed: this.closures.filter(c => String(c.date).slice(0, 10) === date).length }));
    }
  },
  async mounted() {
    try {
      await this.getData();
    } finally {
      this.isLoading = false;
    }
  },
  methods: {
    async getData() {
      const api = service({ requiresAuth: true });
      const until = moment().add(1, "year").format("YYYY-MM-DD");
      const range = `_where[date_gte]=${this.today}&_where[date_lte]=${until}&_limit=-1&_sort=date:ASC`;
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const isMember = !!(user && (user.permissions || []).some(p => p.permission === "orders"));
      const [closures, festives, pending] = await Promise.all([
        api.get(`route-festives?${range}`).then(r => r.data || []).catch(() => []),
        api.get(`festives?${range}`).then(r => r.data || []).catch(() => []),
        isMember
          ? api.get("emitted-invoices/pending-provider?_limit=-1&_sort=name:ASC").then(r => r.data).catch(() => null)
          : Promise.resolve(null)
      ]);
      this.closures = closures;
      // the entity's holidays (a person's days off have a user)
      this.holidays = [...new Set(festives.filter(f => !f.users_permissions_user).map(f => String(f.date).slice(0, 10)))].sort();
      this.invoices = (pending && Array.isArray(pending.invoices) && pending.invoices) || [];
      if (this.invoices.length && !(this.me && this.me.name)) {
        try {
          const entity = (await service({ requiresAuth: true, cached: true }).get("me")).data;
          useMainStore().setMe({ me: entity && entity.data ? entity.data : entity });
        } catch (e) {
          // «de l'entitat»
        }
      }
    },
    substituteOf,
    routeName,
    substituteOpen(date) {
      return substituteOpen(date, this.today);
    },
    openFrom(date) {
      return moment(date, "YYYY-MM-DD").subtract(SUBSTITUTE_DAYS_BEFORE, "days").format("YYYY-MM-DD");
    },
    closureLine(c) {
      return c.route ? `${routeName(c.route)} no passa.` : "No passa cap ruta.";
    },
    isSoon(date) {
      return moment(date, "YYYY-MM-DD").diff(moment(this.today, "YYYY-MM-DD"), "days") <= SUBSTITUTE_DAYS_BEFORE;
    },
    longDay(date) {
      // «divendres 30 d’octubre»: «D MMMM» gives the Catalan «de»/«d’»
      const text = moment(date, "YYYY-MM-DD").locale("ca").format("dddd D MMMM");
      return text.charAt(0).toUpperCase() + text.slice(1);
    },
    dayText(date) {
      return moment(date, "YYYY-MM-DD").locale("ca").format("dddd D MMMM");
    },
    shortDay(date) {
      return moment(date, "YYYY-MM-DD").format("DD/MM");
    }
  }
};
</script>

<style scoped>
.board {
  display: grid;
  gap: 1rem;
  max-width: 56rem;
}
.a-box.is-alert {
  border-left: 4px solid var(--a-warn-line, #e0a800);
}
.box-help {
  font-size: .875rem;
  color: var(--a-muted);
}
.day-list > li {
  padding: .75rem 0;
  border-top: 1px solid var(--a-line-soft);
}
.day-list > li:first-child {
  border-top: 0;
}
.day-item.is-soon .day-head b {
  color: var(--a-fg);
}
.day-head {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-bottom: .25rem;
}
.closure-list li {
  display: flex;
  flex-direction: column;
  padding: .25rem 0 .25rem .75rem;
  border-left: 2px solid var(--a-line);
  margin-top: .375rem;
}
.reason {
  font-size: .875rem;
  color: var(--a-fg-2);
}
.substitute {
  font-size: .875rem;
  color: var(--a-accent-hover);
}
.holiday-list li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: .375rem 0;
  border-top: 1px solid var(--a-line-soft);
}
.holiday-list li:first-child {
  border-top: 0;
}
</style>
