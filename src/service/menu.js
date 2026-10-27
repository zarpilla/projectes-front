const menu = [
  // Inici (views/Inici.vue): no group label, open to everybody
  "",
  [{ to: "/inici", icon: "home-outline", label: "Inici" }],
  "Projectes",
  [
    {
      to: "/projectes",
      icon: "folder-outline",
      label: "Projectes",
      permission: "projects"
    },
    {
      to: "/contactes",
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
      to: "/jornada",
      icon: "account-multiple-outline",
      label: "Persones",
      permission: "projects"
    },
    {
      to: "/tasques",
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
      to: "/factures-emeses",
      icon: "download-outline",
      label: "Ingressos",
      permission: "projects"
    },
    {
      to: "/factures-rebudes",
      icon: "upload-outline",
      label: "Despeses",
      permission: "projects"
    },
    {
      to: "/bestretes",
      icon: "wallet-outline",
      label: "Bestretes",
      permission: "projects"
    },
    {
      to: "/iva",
      icon: "percent-outline",
      label: "IVA",
      permission: "projects"
    },
    {
      to: "/irpf",
      icon: "cash-minus",
      label: "IRPF",
      permission: "projects"
    },
    {
      to: "/tresoreria",
      icon: "bank-outline",
      label: "Tresoreria",
      permission: "projects"
    },
    {
      to: "/pressupostos",
      icon: "file-document-outline",
      label: "Pressupostos",
      permission: "projects"
    }
  ],
  // Logistics: one entry per screen, shown if the person has any of its
  // permissions (orders = member, orders_admin = office, orders_delivery = drivers)
  "Logística",
  [
    { to: "/comandes", icon: "truck-outline", label: "Comandes", permission: ["orders", "orders_admin", "orders_delivery"] },
    { to: "/diposits", icon: "package-down", label: "Dipòsits", permission: ["orders", "orders_admin", "orders_delivery"] },
    { to: "/incidencies", icon: "alert-outline", label: "Incidències", permission: ["orders", "orders_admin", "orders_delivery"] },
    { to: "/transferencies", icon: "swap-horizontal", label: "Transferències", permission: ["orders_admin", "orders_delivery"] },
    { to: "/operacions", icon: "format-list-checks", label: "Operacions", permission: ["orders_admin", "orders_delivery"] },
    { to: "/comandes-per-facturar", icon: "cash-register", label: "Facturar", permission: "orders_admin" },
    { to: "/factures-proveidor", icon: "receipt", label: "Factures", permission: "orders" },
    { to: "/contacta", icon: "message-text-outline", label: "Contacta", permission: "orders", itemClassName: "mb-6" }
  ],
  "Rutes i punts",
  [
    { to: "/poblacions-rutes", icon: "city-variant-outline", label: "Poblacions i rutes", permission: ["orders", "orders_admin"] },
    { to: "/poblacions-punts-entrega", icon: "map-marker-outline", label: "Poblacions i punts", permission: "orders_admin" },
    { to: "/rutes-dies", icon: "calendar-month-outline", label: "Rutes i dies", permission: ["orders", "orders_admin"] },
    { to: "/simulador-logistic", icon: "calculator-variant-outline", label: "Simulador", permission: ["orders", "orders_admin"] },
    { to: "/rutes", icon: "map-marker-path", label: "Rutes", permission: "orders_admin" },
    { to: "/clientes", icon: "store-outline", label: "Punts d'entrega", permission: ["orders", "orders_admin", "orders_delivery"] },
    { to: "/punts-recollida", icon: "basket-outline", label: "Punts de consum", permission: ["orders", "orders_admin"] },
    { to: "/usuaries", icon: "account-group-outline", label: "Sòcies", permission: "orders_admin" },
    // the Logística group of Taules auxiliars, for the office (admins reach it from Administració, issues/159)
    { to: "/administracio/punts-recollida", icon: "table-settings", label: "Taules de logística", permission: ["orders_admin", "admin"], unless: "admin", activeWhen: "logistics-tables", itemClassName: "mb-6" }
  ],
  // Comunitat energètica (views/Energy*.vue)
  "Comunitat energètica",
  [
    { to: "/energia/socies", icon: "account-group-outline", label: "Sòcies i CUPS", permission: "admin_energy", activeWhen: "energy-partners" },
    { to: "/energia/installacions", icon: "solar-power", label: "Instal·lacions i coeficients", permission: "admin_energy", itemClassName: "mb-6" }
  ],
  "Estadístiques",
  [
    { to: "/estadistiques-comandes", icon: "chart-bar", label: "Informe de comandes", permission: "orders_admin" },
    { to: "/estadistiques-incidencies", icon: "alert-box-outline", label: "Informe d'incidències", permission: "orders_admin", itemClassName: "mb-6" }
  ],
  "Informes",
  [
    {
      to: "/panell-projectes",
      icon: "view-dashboard-outline",
      label: "Panell de projectes",
      permission: "projects"
    },
    // {
    //   to: "/projectes-mare",
    //   icon: "file-tree",
    //   label: "Projectes Mare",
    //   permission: "projects"
    // },
    {
      // previst i fet, gràfics i taula (it merged three reports)
      to: "/panell-dedicacio",
      icon: "chart-bar",
      label: "Dedicació",
      permission: ["hours", "projects"]
    },
    {
      to: "/panell-dedicacio-real",
      icon: "chart-gantt",
      label: "% Dedicació real",
      permission: "projects"
    },
    {
      to: "/panell-previsio-dedicacio",
      icon: "chart-timeline-variant",
      label: "Previsió dedicació",
      permission: "projects"
    },
    {
      to: "/panell-detall-economic",
      icon: "scale-balance",
      label: "Ingressos/Despeses",
      permission: "projects"
    },
    {
      to: "/panell-preu-hora",
      icon: "currency-eur",
      label: "Preu hora",
      permission: "projects"
    },
    {
      to: "/previsio",
      icon: "chart-line",
      label: "Previsió econòmica",
      permission: "projects"
    },
    {
      to: "/previsio-facturacio",
      icon: "receipt",
      label: "Previsió facturació",
      permission: "projects"
    },
    {
      to: "/panell-estrategies",
      icon: "target",
      label: "Estratègies",
      permission: "projects"
    },
    {
      to: "/panell-intercooperacio",
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
      to: "/resum-hores",
      icon: "calendar-check-outline",
      label: "Hores anuals",
      permission: "projects"
    },
    {
      to: "/justificacions",
      icon: "clipboard-check-outline",
      label: "Justificacions",
      permission: "projects"
    },
    {
      to: "/subvencions",
      icon: "gift-outline",
      label: "Subvencions",
      permission: "projects"
    }
  ],
  "Administració",
  [
    {
      to: "/administracio/configuracio",
      icon: "settings-outline",
      label: "Configuració general",
      permission: "admin"
    },
    {
      to: "/administracio/usuaries",
      icon: "account-key-outline",
      label: "Usuàries",
      permission: "admin"
    },
    {
      // Verifactu's configuration, its register and the FACe queue share one head
      to: "/administracio/verifactu",
      icon: "certificate-outline",
      label: "Verifactu i FACe",
      permission: "admin",
      activeWhen: "verifactu"
    },
    {
      // the auxiliary tables (service/adminTables.js) share one screen
      to: "/administracio/ambits-projecte",
      icon: "table-settings",
      label: "Taules auxiliars",
      permission: "admin",
      activeWhen: "admin-tables"
    },
    {
      // «Amb el suport de» of the login page and the menu (issues/159)
      to: "/administracio/logos",
      icon: "image-outline",
      label: "Logos",
      permission: "admin"
    },
    {
      // the members' «Contacta» form (issues/159)
      to: "/administracio/missatges",
      icon: "email-outline",
      label: "Missatges",
      permission: "admin"
    },
    {
      // last night's database dump, to download
      to: "/administracio/copia-seguretat",
      icon: "database-export",
      label: "Còpia de seguretat",
      permission: "admin",
      itemClassName: "mb-6"
    }
  ],
  "Altres",
  [
    {
      to: "/novetats",
      icon: "math-log",
      label: "Registre de canvis",
      permission: "projects"
    },
    {
      to: "/importar-exportar",
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
      // The user manual (opens the docs site logged in) and the old videos; for everybody.
      to: "/documentacio",
      icon: "book-open-variant",
      label: "Documentació"
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
  if (!item) return true;
  // `unless`: hidden for people with this permission (they reach it elsewhere)
  if (item.unless && userPermissions.includes(item.unless)) return false;
  if (!item.permission) return true;
  const needed = Array.isArray(item.permission) ? item.permission : [item.permission];
  return needed.some(p => userPermissions.includes(p));
};

export default menu;
