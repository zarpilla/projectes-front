import getConfig from "@/config";
const config = getConfig();
const apiUrl = config.VUE_APP_API_URL;
const menu = [
  "Projectes",
  [
    {
      to: "/projectes",
      icon: "table",
      label: "Projectes",
      permission: "projects"
    },
    {
      to: "/contacts",
      icon: "account-box",
      label: "Contactes",
      permission: "projects"
    },
    {
      to: "/dedicacio",
      label: "Hores dedicades",
      icon: "calendar",
      permission: "hours"
    },
    {
      to: "/registre-jornades",
      icon: "clock",
      label: "Registre Jornades",
      permission: "hours"
    },
    {
      to: "/working-day",
      icon: "account-multiple",
      label: "Persones",
      permission: "projects"
    },
    {
      to: "/tasks",
      icon: "view-column",
      label: "Tasques",
      permission: "projects"
    }
  ],
  "Diners",
  [
    {
      to: "/emitted-invoices",
      icon: "import",
      label: "Ingressos",
      permission: "projects"
    },
    {
      to: "/received-invoices",
      icon: "export",
      label: "Despeses",
      permission: "projects"
    },
    {
      to: "/salary",
      icon: "cash-multiple",
      label: "Bestretes",
      permission: "projects"
    },
    {
      to: "/vat",
      icon: "bank",
      label: "IVA",
      permission: "projects"
    },
    {
      to: "/tresoreria",
      icon: "bank",
      label: "Tresoreria",
      permission: "projects"
    },
    {
      to: "/quotes",
      icon: "calculator",
      label: "Pressupostos",
      permission: "projects"
    }
  ],
  "LOGÍSTICA",
  [
    {
      to: "/orders",
      icon: "truck",
      label: "Comandes",
      permission: "orders"
    },
    {
      to: "/deposits",
      icon: "package-down",
      label: "Dipòsits",
      permission: "orders"
    },
    {
      to: "/provider-invoices",
      icon: "cash-multiple",
      label: "Factures",
      permission: "orders"
    },
    {
      to: "/user-contacts",
      icon: "account-box",
      label: "Punts d'entrega",
      permission: "orders"
    },
    {
      to: "/pickup-points",
      icon: "package",
      label: "Punt de consum",
      permission: "orders"
    },
    {
      to: "/city-route",
      icon: "city",
      label: "Poblacions i rutes",
      permission: "orders"
    },
    {
      to: "/route-days",
      icon: "calendar",
      label: "Rutes i dies",
      permission: "orders"
    },
    {
      to: "/incidences",
      icon: "alert",
      label: "Incidències",
      permission: "orders"
    },
    {
      to: "/contact-us",
      icon: "email",
      label: "Contacta",
      permission: "orders"
    }
  ],
  "LOGÍSTICA ADM",
  [
    {
      to: "/orders",
      icon: "truck",
      label: "Comandes",
      permission: "orders_admin"
    },
    {
      to: "/deposits",
      icon: "package-down",
      label: "Dipòsits",
      permission: "orders_admin"
    },
    {
      to: "/user-contacts",
      icon: "account-box",
      label: "Punts d'entrega",
      permission: "orders_admin"
    },
    {
      to: "/incidences",
      icon: "alert",
      label: "Incidències",
      permission: "orders_admin"
    },
    {
      to: "/transfers",
      icon: "swap-horizontal",
      label: "Transferències",
      permission: "orders_admin"
    },
    {
      to: "/order-operations",
      icon: "format-list-checks",
      label: "Operacions",
      permission: "orders_admin"
    },
    {
      to: "/city-route",
      icon: "city",
      label: "Poblacions i rutes",
      permission: "orders_admin"
    },
    {
      to: "/city-route-delivery",
      icon: "map-marker",
      label: "Poblacions i punts",
      permission: "orders_admin"
    },
    {
      to: "/route-days",
      icon: "calendar",
      label: "Rutes i dies",
      permission: "orders_admin"
    },
    {
      to: "/pickup-points",
      icon: "package",
      label: "Punts de consum",
      permission: "orders_admin"
    },
    {
      to: "/partners",
      icon: "account",
      label: "Sòcies",
      permission: "orders_admin"
    },
    {
      to: "/orders-invoice",
      icon: "cash-multiple",
      label: "Facturar",
      permission: "orders_admin"
    },
    {
      to: "/orders-stats",
      icon: "table",
      label: "Taula Comandes",
      permission: "orders_admin"
    },
    {
      to: "/incidences-stats",
      icon: "table",
      label: "Taula Incidències",
      permission: "orders_admin"
    }
  ],
  "LOGÍSTICA",
  [
    {
      to: "/orders",
      icon: "truck",
      label: "Comandes",
      permission: "orders_delivery"
    },
    {
      to: "/deposits",
      icon: "package-down",
      label: "Dipòsits",
      permission: "orders_delivery"
    },
    {
      to: "/user-contacts",
      icon: "account-box",
      label: "Punts d'entrega",
      permission: "orders_delivery"
    },
    {
      to: "/incidences",
      icon: "alert",
      label: "Incidències",
      permission: "orders_delivery"
    },
    {
      to: "/transfers",
      icon: "swap-horizontal",
      label: "Transferències",
      permission: "orders_delivery"
    },
    {
      to: "/order-operations",
      icon: "format-list-checks",
      label: "Operacions",
      permission: "orders_delivery"
    }
  ],
  "Consulta dades",
  [
    {
      to: "/stats-projectes",
      icon: "table",
      label: "Projectes",
      permission: "projects"
    },
    // {
    //   to: "/mother-projects",
    //   icon: "file-tree",
    //   label: "Projectes Mare",
    //   permission: "projects"
    // },
    {
      to: "/dedicacio-charts",
      label: "Dedicació",
      icon: "chart-pie",
      permission: "hours"
    },
    {
      to: "/stats-dedicacio",
      icon: "table",
      label: "Dedicació",
      permission: "hours"
    },
    {
      to: "/stats-previsio-gantt",
      icon: "chart-timeline",
      label: "Previsió dedicació",
      permission: "projects"
    },
    {
      to: "/stats-previsio-hores",
      icon: "table",
      label: "Prev./Real Dedicació",
      permission: "projects"
    },
    {
      to: "/stats-economic-detail",
      icon: "table",
      label: "Ingressos/Despeses",
      permission: "projects"
    },
    {
      to: "/price-hour",
      icon: "table",
      label: "Preu Hora",
      permission: "projects"
    },
    {
      to: "/forecast",
      icon: "table",
      label: "Previsió Econòmica",
      permission: "projects"
    },
    {
      to: "/stats-estrategies",
      icon: "table",
      label: "Estratègies",
      permission: "projects"
    },
    {
      to: "/stats-intercoop",
      icon: "table",
      label: "Intercooperació",
      permission: "projects"
    },
    {
      to: "/dedicacio-saldo",
      icon: "table",
      label: "Saldo hores",
      permission: "projects"
    },
    {
      to: "/dedicacio-summary",
      icon: "table",
      label: "Hores anuals",
      permission: "projects"
    },
    {
      to: "/justifications",
      icon: "table",
      label: "Justificacions",
      permission: "projects"
    },
    {
      to: "/grants",
      icon: "table",
      label: "Subvencions",
      permission: "projects"
    }
  ],
  "ADMINISTRACIÓ",
  [
    {
      to: "/admin/me",
      icon: "settings",
      label: "Configuració general",
      permission: "admin"
    },
    {
      to: "/admin/users",
      icon: "account-multiple",
      label: "Usuaris",
      permission: "admin"
    },
    {
      to: "/admin/verifactu",
      icon: "certificate",
      label: "Verifactu",
      permission: "admin"
    },
    {
      to: "/admin/verifactu-chain",
      icon: "link-variant",
      label: "Factures Verifactu",
      permission: "admin"
    },
    {
      to: "/admin/face-queue",
      icon: "format-list-bulleted-square",
      label: "Factures FACE",
      permission: "admin"
    },
    {
      to: "/admin/project-scope",
      icon: "tag",
      label: "Àmbits de projecte",
      permission: "admin"
    },
    {
      to: "/admin/year",
      icon: "calendar",
      label: "Anys",
      permission: "admin"
    },
    {
      to: "/admin/bank-accounts",
      icon: "bank",
      label: "Comptes bancaris",
      permission: "admin"
    },
    {
      to: "/admin/social-entity",
      icon: "account-group",
      label: "Entitats socials",
      permission: "admin"
    },
    {
      to: "/admin/project-state",
      icon: "state-machine",
      label: "Estats de projecte",
      permission: "admin"
    },
    {
      to: "/admin/task-state",
      icon: "state-machine",
      label: "Estats de tasca",
      permission: "admin"
    },
    {
      to: "/admin/strategy",
      icon: "strategy",
      label: "Estratègies",
      permission: "admin"
    },
    {
      to: "/admin/legal-form",
      icon: "gavel",
      label: "Formes jurídiques",
      permission: "admin"
    },
    {
      to: "/admin/payment-method",
      icon: "cash",
      label: "Mètodes de pagament",
      permission: "admin"
    },
    {
      to: "/admin/regions",
      icon: "map",
      label: "Regions",
      permission: "admin"
    },
    {
      to: "/admin/sector",
      icon: "tag",
      label: "Sectors",
      permission: "admin"
    },
    {
      to: "/admin/serie",
      icon: "counter",
      label: "Sèries",
      permission: "admin"
    },
    {
      to: "/admin/contact-type",
      icon: "tag",
      label: "Tipus de contacte",
      permission: "admin"
    },
    {
      to: "/admin/dedication-type",
      icon: "tag",
      label: "Tipus de dedicació",
      permission: "admin"
    },
    {
      to: "/admin/expense-type",
      icon: "tag",
      label: "Tipus de despesa",
      permission: "admin"
    },
    {
      to: "/admin/income-type",
      icon: "tag",
      label: "Tipus d'ingrés",
      permission: "admin"
    },
    {
      to: "/admin/project-type",
      icon: "tag",
      label: "Tipus de projecte",
      permission: "admin",
      itemClassName: "mb-6"
    }
  ],
  "Altres",
  [
    {
      href: `${apiUrl}/admin`,
      icon: "open-in-new",
      label: "Strapi",
      permission: "projects"
    },
    {
      to: "/import-export",
      icon: "swap-vertical",
      label: "Importar/Exportar",
      permission: "projects"
    },
    {
      to: "/changelog",
      icon: "math-log",
      label: "Registre de canvis",
      permission: "projects"
    },
    {
      to: "/contasol",
      icon: "account-cash",
      label: "Contasol",
      permission: "projects"
    },
    {
      to: "/verifactu",
      icon: "bank",
      label: "Verifactu",
      permission: "projects",
      itemClassName: "mb-6"
    }
  ]
];

export default menu;
