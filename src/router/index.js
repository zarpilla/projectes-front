import { canOpen, landingPath, userPermissions } from "@/domain/routeAccess";
import { createRouter, createWebHistory } from "vue-router";
import { redirectLegacyHash } from "./legacyHash";
import Home from "../views/Home.vue";
import Login from "../views/Login.vue";

const routes = [
  {
    // Document title tag
    // We combine it with defaultDocumentTitle set in `src/main.js` on router.afterEach hook
    meta: {
      title: "Accedeix"
    },
    path: "/",
    name: "login",
    component: Login
  },
  {
    meta: {
      title: "Recuperar clau de pas"
    },
    path: "/forgotten-password",
    name: "forgotten.password",
    component: () =>
      import("../views/ForgottenPassword.vue")
  },
  {
    meta: {
      title: "Canviar clau de pas"
    },
    path: "/reset-password",
    name: "reset.password",
    component: () =>
      import("../views/ResetPassword.vue")
  },
  {
    meta: {
      title: "Inici",
      requiresAuth: true
    },
    path: "/inici",
    name: "inici",
    component: () =>
      import("../views/Inici.vue"),
  },
  {
    meta: {
      title: "Projectes",
      requiresAuth: true
    },
    path: "/projectes",
    name: "projectes.view",
    component: () =>
      import("../views/Home.vue"),
    props: true,
  },
  {
    meta: {
      title: "Panell Projectes",
      requiresAuth: true
    },
    path: "/stats-projectes",
    name: "stats.projectes",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import("../views/StatsProjectes.vue"),
  },
  {
    meta: {
      title: "Projectes Mare",
      requiresAuth: true
    },
    path: "/mother-projects",
    name: "mother.projects",
    component: () =>
      import("../views/MotherProjectsList.vue"),
  },
  {
    meta: {
      title: "Dedicació",
      requiresAuth: true
    },
    path: "/stats-dedicacio",
    name: "stats.dedicacio",
    component: () =>
      import("../views/StatsDedicacio.vue"),
  },
  {
    meta: {
      title: "Panell Detall econòmic",
      requiresAuth: true
    },
    path: "/stats-economic-detail",
    name: "stats.economic-detail",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(
        "../views/StatsEconomicDetail.vue"
      ),
  },
  {
    meta: {
      title: "Panell Preu Hora",
      requiresAuth: true
    },
    path: "/price-hour",
    name: "stats.price-hour",
    component: () =>
      import("../views/PricePerHour.vue"),
  },
  // the old «Panell Despeses» (empty since Strapi 5): the same figures, in detail (issues/114)
  { path: "/stats-despeses", redirect: "/stats-economic-detail" },
  // «Prev./Real dedicació» and «Dedicació (gràfic)» became Informes › Dedicació
  { path: "/stats-previsio-hores", redirect: "/stats-dedicacio" },
  { path: "/dedicacio-charts", redirect: "/stats-dedicacio" },
  {
    meta: {
      title: "Panell Previsió Dedicacio",
      requiresAuth: true
    },
    path: "/stats-previsio-gantt",
    name: "stats.previsiogantt",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(
        "../views/StatsDedicacioGantt.vue"
      ),
  },
  {
    meta: {
      title: "Panell Dedicació Real",
      requiresAuth: true
    },
    path: "/stats-real-gantt",
    name: "stats.realgantt",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import(
        "../views/StatsRealDedicacioGantt.vue"
      ),
  },

  {
    meta: {
      title: "Panell Estratègies",
      requiresAuth: true
    },
    path: "/stats-estrategies",
    name: "stats.estrategies",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import("../views/StatsEstrategies.vue"),
  },
  {
    meta: {
      title: "Panell Intercooperació",
      requiresAuth: true
    },
    path: "/stats-intercoop",
    name: "stats.intercoop",
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () =>
      import("../views/StatsIntercoop.vue"),
  },
  {
    meta: {
      title: "Edita Projecte",
      requiresAuth: true
    },
    path: "/project/:id",
    name: "project.edit",
    component: () =>
      import("../views/ProjectForm.vue"),
    props: true,
  },
  {
    meta: {
      title: "Edita document",
      requiresAuth: true
    },
    path: "/document/:id/:type",
    name: "document.edit",
    component: () =>
      import(
        "../views/EmittedInvoiceForm.vue"
      ),
    props: true,
  },
  {
    meta: {
      title: "El meu compte",
      requiresAuth: true
    },
    path: "/profile",
    name: "profile",
    component: () =>
      import("../views/Profile.vue"),
  },
  {
    // the template's demo client form used to answer here (issues/084)
    path: "/client/:id",
    redirect: to => `/contact/${to.params.id}`
  },
  {
    meta: {
      title: "Dedicació",
      requiresAuth: true
    },
    path: "/dedicacio",
    name: "dedicacio",
    component: () =>
      import("../views/Dedicacio.vue"),
    props: true,
  },
  {
    meta: {
      title: "Saldo Projectes",
      requiresAuth: true
    },
    path: "/dedicacio-saldo",
    name: "dedicacio-saldo",
    component: () =>
      import("../views/DedicacioSaldo.vue"),
  },
  {
    meta: {
      title: "Jornada diària",
      requiresAuth: true
    },
    path: "/registre-jornades",
    name: "jornada",
    component: () =>
      import("../views/Jornada.vue"),
  },
  {
    meta: {
      title: "Resum Hores",
      requiresAuth: true
    },
    path: "/dedicacio-summary",
    name: "dedicacio-summary",
    component: () =>
      import(
        "../views/DedicacioSummary.vue"
      ),
  },
  {
    meta: {
      title: "Jornada",
      requiresAuth: true
    },
    path: "/working-day",
    name: "dedicacio-working-day",
    component: () =>
      import(
        "../views/DedicacioWorkingDay.vue"
      ),
  },
  {
    meta: {
      title: "Bestretes",
      requiresAuth: true
    },
    path: "/salary",
    name: "dedicacio-salary",
    component: () =>
      import(
        "../views/DedicacioSalary.vue"
      ),
  },
  {
    meta: {
      title: "Justificacions",
      requiresAuth: true
    },
    path: "/justifications",
    name: "justifications",
    component: () =>
      import("../views/Justifications.vue"),
  },
  {
    meta: {
      title: "Subvencions",
      requiresAuth: true
    },
    path: "/grants",
    name: "subvencions",
    component: () =>
      import("../views/Grants.vue"),
  },
  {
    meta: {
      title: "Tresoreria",
      requiresAuth: true
    },
    path: "/tresoreria",
    name: "tresoreria.view",
    component: () =>
      import("../views/Tresoreria.vue"),
    props: true,
  },
  {
    meta: {
      title: "IVA",
      requiresAuth: true
    },
    path: "/vat",
    name: "vat.view",
    component: () =>
      import("../views/Vat.vue"),
    props: true,
  },
  {
    meta: {
      title: "Factures emeses",
      requiresAuth: true
    },
    path: "/emitted-invoices",
    name: "emitted.invoices.view",
    component: () =>
      import("../views/EmittedInvoices.vue"),
    props: true,
  },
  {
    meta: {
      title: "Factures rebudes",
      requiresAuth: true
    },
    path: "/received-invoices",
    name: "received.invoices.view",
    component: () =>
      import("../views/ReceivedInvoices.vue"),
    props: true,
  },
  {
    meta: {
      title: "Pressupostos",
      requiresAuth: true
    },
    path: "/quotes",
    name: "quotes.view",
    component: () =>
      import("../views/Quotes.vue"),
    props: true,
  },
  {
    meta: {
      title: "Previsió",
      requiresAuth: true
    },
    path: "/forecast",
    name: "forecast.view",
    component: () =>
      import("../views/Forecast.vue"),
    props: true,
  },
  {
    meta: {
      title: "Previsió facturació",
      requiresAuth: true
    },
    path: "/invoicing-forecast",
    name: "invoicing-forecast.view",
    component: () =>
      import("../views/InvoicingForecast.vue"),
  },
  {
    meta: {
      title: "Contactes",
      requiresAuth: true,
      userContacts: false
    },
    path: "/contacts",
    name: "contacts.view",
    component: () =>
      import("../views/Contacts.vue"),
    props: true,
  },
  {
    meta: {
      title: "Clientes",
      requiresAuth: true,
      userContacts: true
    },
    path: "/user-contacts",
    name: "user-contacts.view",
    component: () =>
      import("../views/ContactsUser.vue"),
    props: true,
  },
  {
    meta: {
      title: "Comandes",
      requiresAuth: true
    },
    path: "/orders",
    name: "orders.view",
    component: () =>
      import("../views/Orders.vue"),
    props: true,
  },
  {
    meta: {
      title: "Comandes per facturar",
      requiresAuth: true
    },
    path: "/orders-invoice",
    name: "orders-invoice.view",
    component: () =>
      import("../views/OrdersInvoice.vue"),
    props: true,
  },
  {
    meta: {
      title: "Veure Comanda",
      requiresAuth: true
    },
    path: "/order/view/:id",
    name: "orders.view.detail",
    component: () =>
      import("../views/OrderView.vue"),
    props: true,
  },
  {
    meta: {
      title: "Comanda",
      requiresAuth: true
    },
    path: "/order/:id",
    name: "orders.edit",
    component: () =>
      import("../views/OrderForm.vue"),
    props: true,
  },
  {
    meta: {
      title: "Poblacions i rutes",
      requiresAuth: true
    },
    path: "/city-route",
    name: "cityroute.edit",
    component: () =>
      import("../views/CityRoute.vue"),
    props: true,
  },
  {
    meta: {
      title: "Poblacions i punts d'entrega",
      requiresAuth: true
    },
    path: "/city-route-delivery",
    name: "cityroutedelivery.edit",
    component: () =>
      import("../views/CityRouteDelivery.vue"),
    props: true,
  },
  {
    meta: {
      title: "Rutes i dies",
      requiresAuth: true
    },
    path: "/route-days",
    name: "routedays.edit",
    component: () =>
      import("../views/RouteDays.vue"),
    props: true,
  },
  {
    meta: {
      title: "Rutes",
      requiresAuth: true
    },
    path: "/routes",
    name: "routes.edit",
    component: () =>
      import("../views/Routes.vue"),
  },
  {
    meta: {
      title: "Punts de recollida",
      requiresAuth: true
    },
    path: "/pickup-points",
    name: "pickup-points.edit",
    component: () =>
      import("../views/PickupPointsOrders.vue"),
    props: true,
  },

  {
    meta: {
      title: "Estadístiques de comandes",
      requiresAuth: true
    },
    path: "/orders-stats",
    name: "orders.stats",
    component: () =>
      import("../views/StatsOrders.vue"),
    props: true,
  },
  {
    meta: {
      title: "Estadístiques d'incidències",
      requiresAuth: true
    },
    path: "/incidences-stats",
    name: "incidences.stats",
    component: () =>
      import("../views/StatsIncidences.vue"),
    props: true,
  },
  {
    meta: {
      title: "Factures",
      requiresAuth: true
    },
    path: "/provider-invoices",
    name: "provider.invoices",
    component: () =>
      import(
        "../views/EmittedInvoicesProvider.vue"
      ),
    props: true,
  },
  {
    meta: {
      title: "Contacta amb nosaltres",
      requiresAuth: true
    },
    path: "/contact-us",
    name: "contact-us",
    component: () =>
      import("../views/ContactUs.vue"),
    props: true,
  },
  {
    meta: {
      title: "Contacte",
      requiresAuth: true
    },
    path: "/contact/:id",
    name: "contacts.edit",
    component: () =>
      import("../views/ContactForm.vue"),
    props: true,
  },
  {
    meta: {
      title: "Punt d'entrega",
      requiresAuth: true
    },
    path: "/contact-user/:id",
    name: "contactsuser.edit",
    component: () =>
      import("../views/ContactUserForm.vue"),
    props: true,
  },
  {
    meta: {
      title: "Documentació",
      requiresAuth: true
    },
    path: "/documentacio",
    name: "documentation.view",
    component: () =>
      import("../views/Documentation.vue"),
    props: true,
  },
  {
    meta: {
      title: "Tasques",
      requiresAuth: true
    },
    path: "/tasks",
    name: "tasks.view",
    component: () =>
      import("../views/TasksView.vue"),
    props: true,
  },
  {
    meta: {
      title: "Recàlcul",
      requiresAuth: true
    },
    path: "/recalculate",
    name: "projects.recalculate",
    component: () =>
      import("../views/Recalculate.vue"),
    props: true,
  },
  {
    meta: {
      title: "Changelog",
      requiresAuth: true
    },
    path: "/changelog",
    name: "changelog",
    component: () =>
      import("../views/ChangeLog.vue"),
    props: true,
  },
  {
    meta: {
      title: "Verifactu",
      requiresAuth: true
    },
    path: "/verifactu",
    name: "VerifactuDeclaration",
    component: () =>
      import(
        "../views/VerifactuDeclaration.vue"
      ),
    props: true,
  },
  {
    meta: {
      title: "Usuàries",
      requiresAuth: true
    },
    path: "/partners",
    name: "partners.list",
    component: () =>
      import("../views/Partners.vue"),
    props: true,
  },
  {
    meta: {
      title: "Incidències",
      requiresAuth: true
    },
    path: "/incidences",
    name: "incidences.list",
    component: () =>
      import("../views/Incidences.vue"),
    props: true,
  },
  {
    meta: {
      title: "Transferències",
      requiresAuth: true
    },
    path: "/transfers",
    name: "transfers.list",
    component: () =>
      import("../views/Transfers.vue"),
    props: true,
  },
  {
    meta: {
      title: "Dipòsits",
      requiresAuth: true
    },
    path: "/deposits",
    name: "deposits.list",
    component: () =>
      import("../views/Deposits.vue"),
    props: true,
  },
  {
    meta: {
      title: "Operacions",
      requiresAuth: true
    },
    path: "/order-operations",
    name: "order-operations.list",
    component: () =>
      import("../views/OrderOperations.vue"),
    props: true,
  },
  {
    meta: {
      title: "Importar/Exportar",
      requiresAuth: true
    },
    path: "/import-export",
    name: "import-export.view",
    component: () =>
      import("../views/ImportExport.vue"),
    props: true,
  },
  {
    path: "/contasol",
    name: "contasol.view",
    component: () =>
      import("../views/Contasol.vue"),
    props: true,
    meta: {
      title: "Contasol",
      requiresAuth: true
    }
  },
  // Admin routes - specific routes must come before dynamic ones
  {
    path: "/admin/me",
    name: "admin.me",
    component: () =>
      import("../views/Me.vue"),
    meta: {
      title: "Configuració General",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/verifactu",
    name: "admin.verifactu",
    component: () =>
      import("../views/Verifactu.vue"),
    meta: {
      title: "Verifactu",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/face-queue",
    name: "admin.face-queue.list",
    component: () =>
      import("../views/FaceQueueList.vue"),
    meta: {
      title: "Factures FACe",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/face-queue/:id",
    name: "admin.face-queue.edit",
    component: () =>
      import("../views/FaceQueueEdit.vue"),
    props: true,
    meta: {
      title: "Editar cua FACE",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/verifactu-chain",
    name: "admin.verifactu-chain.list",
    component: () =>
      import("../views/VerifactuChainList.vue"),
    meta: {
      title: "Factures Verifactu",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/verifactu-chain/:id",
    name: "admin.verifactu-chain.edit",
    component: () =>
      import("../views/VerifactuChainEdit.vue"),
    props: true,
    meta: {
      title: "Editar cadena Verifactu",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/users",
    name: "admin.users.list",
    component: () =>
      import("../views/AdminUserList.vue"),
    meta: {
      title: "Usuàries",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/users/new",
    name: "admin.users.new",
    component: () =>
      import("../views/AdminUserForm.vue"),
    meta: {
      title: "Crear usuari",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/users/:id",
    name: "admin.users.edit",
    component: () =>
      import("../views/AdminUserForm.vue"),
    props: true,
    meta: {
      title: "Editar usuari",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  // the supporters' logos and the «Contacta» messages (issues/159), before
  // the generic /admin/:entityName
  {
    path: "/admin/logos",
    name: "admin.logos",
    component: () =>
      import("../views/AdminLogos.vue"),
    meta: {
      title: "Logos",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/form-submissions",
    name: "admin.form-submissions",
    component: () =>
      import("../views/AdminFormSubmissions.vue"),
    meta: {
      title: "Missatges",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  // Admin entity management routes
  // Strapi 3 names of two entities, kept for bookmarks (issues/026)
  { path: "/admin/bank-accounts", redirect: "/admin/bank-account" },
  { path: "/admin/regions", redirect: "/admin/region" },
  {
    path: "/admin/:entityName",
    name: "admin.entity.list",
    component: () =>
      import("../views/AdminEntityList.vue"),
    props: true,
    meta: {
      title: "Administració",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/:entityName/new",
    name: "admin.entity.new",
    component: () =>
      import("../views/AdminEntityForm.vue"),
    props: route => ({ entityName: route.params.entityName }),
    meta: {
      title: "Crear entitat",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/admin/:entityName/:id",
    name: "admin.entity.edit",
    component: () =>
      import("../views/AdminEntityForm.vue"),
    props: true,
    meta: {
      title: "Editar entitat",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  }
];

redirectLegacyHash(import.meta.env.BASE_URL);

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { left: 0, top: 0 };
    }
  }
});

router.beforeEach((to, from, next) => {
  // Check if navigating to /projectes and redirect based on localStorage preference
  if (to.path === "/projectes" && from.path !== "/mother-projects") {
    const defaultView = localStorage.getItem("projectsDefaultView");
    if (defaultView === "mother") {
      next({ path: "/mother-projects" });
      return;
    }
  }
  
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (localStorage.getItem("jwt") == null) {
      next({
        path: "/",
        query: { nextUrl: to.fullPath }
      });
    } else {
      // every page asks the permissions of its menu entry (issues/121): a user
      // without them goes to her own landing page
      const user = JSON.parse(localStorage.getItem("user"));
      // permissions not loaded yet (just logged in): App.vue loads /users/me
      // and the API refuses what isn't hers anyway
      const known = !!(user && Array.isArray(user.permissions));
      const permissions = userPermissions(user);
      if (!known || canOpen(to.matched, permissions, to.params)) {
        next();
      } else {
        const landing = landingPath(permissions);
        next(landing === to.path ? "/profile" : landing);
      }
    }
  } else if (to.matched.some(record => record.meta.guest)) {
    if (localStorage.getItem("jwt") == null) {
      next();
    } else {
      next({ name: "inici" });
    }
  } else {
    next();
  }
});

export default router;
