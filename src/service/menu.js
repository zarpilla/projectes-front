const menu = [
    'Projectes',
    [
      {
        to: '/projectes',
        icon: 'table',
        label: 'Projectes',
        permission: 'projects'
      },
      {
        to: '/contacts',
        icon: 'account-box',
        label: 'Contactes',
        permission: 'projects'
      },
      {
        to: '/dedicacio',
        label: 'Hores dedicades',
        icon: 'calendar',
        permission: 'projects'
      },
      {
        to: '/registre-jornades',
        icon: 'clock',
        label: 'Registre Jornades',
        permission: 'projects'
      },
      {
        to: '/working-day',
        icon: 'account-multiple',
        label: 'Persones',
        permission: 'projects'
      },
      {
        to: '/tasks',
        icon: 'view-column',
        label: 'Tasques',
        permission: 'projects'
      }
    ],
    'Diners',
    [
      {
        to: '/emitted-invoices',
        icon: 'import',
        label: 'Ingressos',
        permission: 'projects'
      },
      {
        to: '/received-invoices',
        icon: 'export',
        label: 'Despeses',
        permission: 'projects'
      },
      {
        to: '/salary',
        icon: 'cash-multiple',
        label: 'Bestretes',
        permission: 'projects'
      },
      {
        to: '/tresoreria',
        icon: 'bank',
        label: 'Tresoreria',
        permission: 'projects'
      },
      {
        to: '/quotes',
        icon: 'calculator',
        label: 'Pressupostos',
        permission: 'projects'
      } 
    ],
    'COMANDES',
    [
      {
        to: '/user-contacts',
        icon: 'account-box',
        label: 'Clientes',
        permission: 'orders'
      },
      {
        to: '/orders',
        icon: 'truck',
        label: 'Comandes',
        permission: 'orders'
      }
    ],
    'COMANDES ADM',
    [
      {
        to: '/user-contacts',
        icon: 'account-box',
        label: 'Clientes',
        permission: 'orders_admin'
      },
      {
        to: '/orders',
        icon: 'truck',
        label: 'Comandes',
        permission: 'orders_admin'
      }
    ],
    'Consulta dades',
    [
      {
        to: '/stats-projectes',
        icon: 'table',
        label: 'Projectes',
        permission: 'projects'
      },
      {
        to: '/dedicacio-charts',
        label: 'Dedicació',
        icon: 'chart-pie',
        permission: 'projects'
      },
      {
        to: '/stats-dedicacio',
        icon: 'table',
        label: 'Dedicació',
        permission: 'projects'
      },
      {
        to: '/stats-previsio-gantt',
        icon: 'chart-timeline',
        label: 'Previsió dedicació',
        permission: 'projects'
      },
      {
        to: '/stats-previsio-hores',
        icon: 'table',
        label: 'Prev./Real Dedicació',
        permission: 'projects'
      },          
      {
        to: '/stats-economic-detail',
        icon: 'table',
        label: 'Ingressos/Despeses',
        permission: 'projects'
      },
      {
        to: '/price-hour',
        icon: 'table',
        label: 'Preu Hora',
        permission: 'projects'
      },
      {
        to: '/forecast',
        icon: 'table',
        label: 'Previsió Econòmica',
        permission: 'projects'
      },   
      {
        to: '/stats-estrategies',
        icon: 'table',
        label: 'Estratègies',
        permission: 'projects'
      },
      {
        to: '/stats-intercoop',
        icon: 'table',
        label: 'Intercooperació',
        permission: 'projects'
      },
      {
        to: '/dedicacio-saldo',
        icon: 'table',
        label: 'Saldo hores',
        permission: 'projects'
      },
      {
        to: '/dedicacio-summary',
        icon: 'table',
        label: 'Hores anuals',
        permission: 'projects'
      },
      {
        to: '/justifications',
        icon: 'table',
        label: 'Justificacions',
        permission: 'projects'
      },
      {
        to: '/grants',
        icon: 'table',
        label: 'Subvencions',
        permission: 'projects'
      }
    ],
    'Altres',
    [
      {
        href: `${process.env.VUE_APP_API_URL || 'http://localhost:1337'}/admin`,
        icon: 'open-in-new',
        label: 'Strapi',
        permission: 'projects'
      },
      {
        to: '/changelog',
        icon: 'math-log',
        label: 'Registre de canvis',
        permission: 'projects'
      },
      {
        to: '/documentacio',
        icon: 'help-circle',
        label: 'Documentació',
        permission: 'projects'
      }      
    ]
    //,
    // 'About',
    // [
    //   {
    //     href: 'https://admin-one.justboil.me',
    //     label: 'Premium Demo',
    //     icon: 'credit-card'
    //   },
    //   {
    //     href: 'https://justboil.me/bulma-admin-template/one',
    //     label: 'About',
    //     icon: 'help-circle'
    //   }
    // ]
  ]

export default menu