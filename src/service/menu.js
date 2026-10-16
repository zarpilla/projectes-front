import getConfig from "@/config";
const config = getConfig();
const apiUrl = config.VUE_APP_API_URL;
const menu = [
  "Projectes",
  [
    {
      to: "/projectes",
      icon: "folder-outline",
      label: "Projectes",
      permission: "projects"
    },
    {
      to: "/contacts",
      icon: "account-box-outline",
      label: "Contactes",
      permission: "projects"
    },
    {
      to: "/dedicacio",
      label: "Hores dedicades",
      icon: "calendar-blank-outline",
      permission: "hours"
    },
    {
      to: "/registre-jornades",
      icon: "clock-outline",
      label: "Registre jornades",
      permission: "hours"
    },
    {
      to: "/working-day",
      icon: "account-multiple-outline",
      label: "Persones",
      permission: "projects"
    },
    {
      to: "/tasks",
      icon: "trello",
      label: "Tasques",
      permission: "projects"
    }
  ],
  "Diners",
  [
    {
      to: "/emitted-invoices",
      icon: "download-outline",
      label: "Ingressos",
      permission: "projects"
    },
    {
      to: "/received-invoices",
      icon: "upload-outline",
      label: "Despeses",
      permission: "projects"
    },
    {
      to: "/salary",
      icon: "wallet-outline",
      label: "Bestretes",
      permission: "projects"
    },
    {
      to: "/vat",
      icon: "percent-outline",
      label: "IVA",
      permission: "projects"
    },
    {
      to: "/tresoreria",
      icon: "bank-outline",
      label: "Tresoreria",
      permission: "projects"
    },
    {
      to: "/quotes",
      icon: "file-document-outline",
      label: "Pressupostos",
      permission: "projects"
    }
  ],
  "Logística",
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
  "Logística · oficina",
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
  "Logística · repartiment",
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
  "Informes",
  [
    {
      to: "/stats-projectes",
      icon: "view-dashboard-outline",
      label: "Panell de projectes",
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
      label: "Dedicació (gràfic)",
      icon: "chart-pie",
      permission: "hours"
    },
    {
      to: "/stats-dedicacio",
      icon: "table-large",
      label: "Dedicació (taula)",
      permission: "hours"
    },
    {
      to: "/stats-real-gantt",
      icon: "chart-gantt",
      label: "% Dedicació real",
      permission: "projects"
    },
    {
      to: "/stats-previsio-gantt",
      icon: "chart-timeline-variant",
      label: "Previsió dedicació",
      permission: "projects"
    },
    
    {
      to: "/stats-previsio-hores",
      icon: "chart-bar",
      label: "Prev./Real dedicació",
      permission: "projects"
    },
    {
      to: "/stats-economic-detail",
      icon: "scale-balance",
      label: "Ingressos/Despeses",
      permission: "projects"
    },
    {
      to: "/price-hour",
      icon: "currency-eur",
      label: "Preu hora",
      permission: "projects"
    },
    {
      to: "/forecast",
      icon: "chart-line",
      label: "Previsió econòmica",
      permission: "projects"
    },
    {
      to: "/stats-estrategies",
      icon: "target",
      label: "Estratègies",
      permission: "projects"
    },
    {
      to: "/stats-intercoop",
      icon: "sitemap",
      label: "Intercooperació",
      permission: "projects"
    },
    {
      to: "/dedicacio-saldo",
      icon: "timer-sand",
      label: "Saldo hores",
      permission: "projects"
    },
    {
      to: "/dedicacio-summary",
      icon: "calendar-check-outline",
      label: "Hores anuals",
      permission: "projects"
    },
    {
      to: "/justifications",
      icon: "clipboard-check-outline",
      label: "Justificacions",
      permission: "projects"
    },
    {
      to: "/grants",
      icon: "gift-outline",
      label: "Subvencions",
      permission: "projects"
    }
  ],
  "Administració",
  [
    {
      to: "/admin/me",
      icon: "settings-outline",
      label: "Configuració general",
      permission: "admin"
    },
    {
      to: "/admin/users",
      icon: "account-key-outline",
      label: "Usuàries",
      permission: "admin"
    },
    {
      // Verifactu's configuration, its register and the FACe queue share one head
      to: "/admin/verifactu",
      icon: "certificate-outline",
      label: "Verifactu i FACe",
      permission: "admin",
      activeWhen: "verifactu"
    },
    {
      // the 19 auxiliary tables (service/adminTables.js) share one screen
      to: "/admin/project-scope",
      icon: "table-settings",
      label: "Taules auxiliars",
      permission: "admin",
      activeWhen: "admin-tables",
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
      permission: "projects"
    },
    {
      // Opens the tickets site logged in (issues/019); handled in AsideMenu.menuClick.
      href: "#",
      action: "tickets",
      icon: "ticket-outline",
      label: "Tiquets",
      permission: "projects",
      itemClassName: "mb-6"
    }
  ]
];

export default menu;
