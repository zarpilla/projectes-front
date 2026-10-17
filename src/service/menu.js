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
      permission: "projects",
      // dot with the person's overdue and new tasks (stores/taskAlerts.js)
      badge: "tasks"
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
  // Logistics: one entry per screen, shown if the person has any of its
  // permissions (orders = member, orders_admin = office, orders_delivery = drivers)
  "Logística",
  [
    { to: "/orders", icon: "truck-outline", label: "Comandes", permission: ["orders", "orders_admin", "orders_delivery"] },
    { to: "/deposits", icon: "package-down", label: "Dipòsits", permission: ["orders", "orders_admin", "orders_delivery"] },
    { to: "/incidences", icon: "alert-outline", label: "Incidències", permission: ["orders", "orders_admin", "orders_delivery"] },
    { to: "/transfers", icon: "swap-horizontal", label: "Transferències", permission: ["orders_admin", "orders_delivery"] },
    { to: "/order-operations", icon: "format-list-checks", label: "Operacions", permission: ["orders_admin", "orders_delivery"] },
    { to: "/orders-invoice", icon: "cash-register", label: "Facturar", permission: "orders_admin" },
    { to: "/provider-invoices", icon: "receipt", label: "Factures", permission: "orders" },
    { to: "/contact-us", icon: "message-text-outline", label: "Contacta", permission: "orders", itemClassName: "mb-6" }
  ],
  "Rutes i punts",
  [
    { to: "/city-route", icon: "city-variant-outline", label: "Poblacions i rutes", permission: ["orders", "orders_admin"] },
    { to: "/city-route-delivery", icon: "map-marker-outline", label: "Poblacions i punts", permission: "orders_admin" },
    { to: "/route-days", icon: "calendar-month-outline", label: "Rutes i dies", permission: ["orders", "orders_admin"] },
    { to: "/user-contacts", icon: "store-outline", label: "Punts d'entrega", permission: ["orders", "orders_admin", "orders_delivery"] },
    { to: "/pickup-points", icon: "basket-outline", label: "Punts de consum", permission: ["orders", "orders_admin"] },
    { to: "/partners", icon: "account-group-outline", label: "Sòcies", permission: "orders_admin", itemClassName: "mb-6" }
  ],
  "Estadístiques",
  [
    { to: "/orders-stats", icon: "table-eye", label: "Taula Comandes", permission: "orders_admin" },
    { to: "/incidences-stats", icon: "table-search", label: "Taula Incidències", permission: "orders_admin", itemClassName: "mb-6" }
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
      // previst i fet, gràfics i taula (it merged three reports)
      to: "/stats-dedicacio",
      icon: "chart-bar",
      label: "Dedicació",
      permission: ["hours", "projects"]
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
      to: "/invoicing-forecast",
      icon: "receipt",
      label: "Previsió facturació",
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
      to: "/changelog",
      icon: "math-log",
      label: "Registre de canvis",
      permission: "projects"
    },
    {
      to: "/import-export",
      icon: "swap-vertical",
      label: "Importar/Exportar",
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

// An entry with no permission is for everybody; `permission` is one permission
// or a list of them (any of them shows the entry).
export const hasMenuPermission = (item, userPermissions) => {
  if (!item || !item.permission) return true;
  const needed = Array.isArray(item.permission) ? item.permission : [item.permission];
  return needed.some(p => userPermissions.includes(p));
};

export default menu;
