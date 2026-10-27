import { canOpen, landingPath, userPermissions } from "@/domain/routeAccess";
import { createRouter, createWebHistory } from "vue-router";
import { redirectLegacyHash } from "./legacyHash";
import { BOARD_PATH, isMemberOnly } from "@/domain/home";
import { legacyRoutes, slugEntity } from "./paths";
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
    path: "/recuperar-clau",
    name: "forgotten.password",
    component: () =>
      import("../views/ForgottenPassword.vue")
  },
  {
    meta: {
      title: "Canviar clau de pas"
    },
    path: "/canviar-clau",
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
      title: "Avisos",
      requiresAuth: true
    },
    // the members' board: route closures, holidays, unpaid invoices (issues/354, 355)
    path: "/avisos",
    name: "avisos",
    component: () =>
      import("../views/Avisos.vue"),
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
    path: "/panell-projectes",
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
    path: "/projectes-mare",
    name: "mother.projects",
    component: () =>
      import("../views/MotherProjectsList.vue"),
  },
  {
    meta: {
      title: "Dedicació",
      requiresAuth: true
    },
    path: "/panell-dedicacio",
    name: "stats.dedicacio",
    component: () =>
      import("../views/StatsDedicacio.vue"),
  },
  {
    meta: {
      title: "Panell Detall econòmic",
      requiresAuth: true
    },
    path: "/panell-detall-economic",
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
    path: "/panell-preu-hora",
    name: "stats.price-hour",
    component: () =>
      import("../views/PricePerHour.vue"),
  },
  {
    meta: {
      title: "Panell Previsió Dedicacio",
      requiresAuth: true
    },
    path: "/panell-previsio-dedicacio",
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
    path: "/panell-dedicacio-real",
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
    path: "/panell-estrategies",
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
    path: "/panell-intercooperacio",
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
    path: "/projecte/:id",
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
    path: "/el-meu-compte",
    name: "profile",
    component: () =>
      import("../views/Profile.vue"),
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
    path: "/resum-hores",
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
    path: "/jornada",
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
    path: "/bestretes",
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
    path: "/justificacions",
    name: "justifications",
    component: () =>
      import("../views/Justifications.vue"),
  },
  {
    meta: {
      title: "Subvencions",
      requiresAuth: true
    },
    path: "/subvencions",
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
    path: "/iva",
    name: "vat.view",
    component: () =>
      import("../views/Vat.vue"),
    props: true,
  },
  {
    // issues/348
    meta: {
      title: "IRPF",
      requiresAuth: true
    },
    path: "/irpf",
    name: "irpf.view",
    component: () =>
      import("../views/Irpf.vue"),
  },
  {
    meta: {
      title: "Factures emeses",
      requiresAuth: true
    },
    path: "/factures-emeses",
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
    path: "/factures-rebudes",
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
    path: "/pressupostos",
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
    path: "/previsio",
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
    path: "/previsio-facturacio",
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
    path: "/contactes",
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
    path: "/clientes",
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
    path: "/comandes",
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
    path: "/comandes-per-facturar",
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
    path: "/comanda/veure/:id",
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
    path: "/comanda/:id",
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
    path: "/poblacions-rutes",
    name: "cityroute.edit",
    component: () =>
      import("../views/CityRoute.vue"),
    props: true,
  },
  {
    meta: {
      title: "Simulador logístic",
      requiresAuth: true
    },
    // what an order would cost, without saving it (issues/361)
    path: "/simulador-logistic",
    name: "logistics.simulator",
    component: () =>
      import("../views/LogisticsSimulator.vue"),
  },
  {
    meta: {
      title: "Poblacions i punts d'entrega",
      requiresAuth: true
    },
    path: "/poblacions-punts-entrega",
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
    path: "/rutes-dies",
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
    path: "/rutes",
    name: "routes.edit",
    component: () =>
      import("../views/Routes.vue"),
  },
  {
    meta: {
      title: "Punts de recollida",
      requiresAuth: true
    },
    path: "/punts-recollida",
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
    path: "/estadistiques-comandes",
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
    path: "/estadistiques-incidencies",
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
    path: "/factures-proveidor",
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
    path: "/contacta",
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
    path: "/contacte/:id",
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
    path: "/punt-entrega/:id",
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
    path: "/tasques",
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
    path: "/recalcul",
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
    path: "/novetats",
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
  // Comunitat energètica (admin_energy, domain/routeAccess.js)
  {
    meta: { title: "Sòcies i CUPS", requiresAuth: true },
    path: "/energia/socies",
    name: "energy.partners",
    component: () => import("../views/EnergyPartners.vue")
  },
  {
    meta: { title: "Sòcia", requiresAuth: true },
    path: "/energia/socia/:id",
    name: "energy.partner",
    component: () => import("../views/EnergyPartnerForm.vue"),
    props: true
  },
  {
    meta: { title: "Instal·lacions i coeficients", requiresAuth: true },
    path: "/energia/installacions",
    name: "energy.installations",
    component: () => import("../views/EnergyInstallations.vue")
  },
  {
    meta: {
      title: "Usuàries",
      requiresAuth: true
    },
    path: "/usuaries",
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
    path: "/incidencies",
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
    path: "/transferencies",
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
    path: "/diposits",
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
    path: "/operacions",
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
    path: "/importar-exportar",
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
    path: "/administracio/configuracio",
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
    path: "/administracio/verifactu",
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
    path: "/administracio/cua-face",
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
    path: "/administracio/cua-face/:id",
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
    path: "/administracio/cadena-verifactu",
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
    path: "/administracio/cadena-verifactu/:id",
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
    path: "/administracio/usuaries",
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
    path: "/administracio/usuaries/nou",
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
    path: "/administracio/usuaries/:id",
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
  // the generic /administracio/:entityName
  {
    path: "/administracio/logos",
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
    // last night's database dump, to download
    path: "/administracio/copia-seguretat",
    name: "admin.backup",
    component: () =>
      import("../views/AdminBackup.vue"),
    meta: {
      title: "Còpia de seguretat",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/administracio/missatges",
    name: "admin.form-submissions",
    component: () =>
      import("../views/AdminFormSubmissions.vue"),
    meta: {
      title: "Missatges",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  // Admin entity management routes: `entityName` in the URL is the entity's
  // Catalan segment (router/paths.js ENTITY_SLUGS); the views get the API name
  {
    path: "/administracio/:entityName",
    name: "admin.entity.list",
    component: () =>
      import("../views/AdminEntityList.vue"),
    props: route => ({ entityName: slugEntity(route.params.entityName) }),
    meta: {
      title: "Administració",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/administracio/:entityName/nou",
    name: "admin.entity.new",
    component: () =>
      import("../views/AdminEntityForm.vue"),
    props: route => ({ entityName: slugEntity(route.params.entityName) }),
    meta: {
      title: "Crear entitat",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  {
    path: "/administracio/:entityName/:id",
    name: "admin.entity.edit",
    component: () =>
      import("../views/AdminEntityForm.vue"),
    props: route => ({ entityName: slugEntity(route.params.entityName), id: route.params.id }),
    meta: {
      title: "Editar entitat",
      requiresAuth: true,
      requiresPermission: "admin"
    }
  },
  // the English and mixed URLs of before issues/343 (QR labels, e-mails, bookmarks, pins)
  ...legacyRoutes()
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
  if (to.path === "/projectes" && from.path !== "/projectes-mare") {
    const defaultView = localStorage.getItem("projectsDefaultView");
    if (defaultView === "mother") {
      next({ path: "/projectes-mare" });
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
        next(landing === to.path ? "/el-meu-compte" : landing);
      }
    }
  } else if (to.matched.some(record => record.meta.guest)) {
    if (localStorage.getItem("jwt") == null) {
      next();
    } else {
      // a member goes to «Avisos» (issues/354)
      const user = JSON.parse(localStorage.getItem("user"));
      next(user && isMemberOnly(userPermissions(user)) ? BOARD_PATH : { name: "inici" });
    }
  } else {
    next();
  }
});

export default router;
