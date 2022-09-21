const menu = [
    'Projectes',
    [
      {
        to: '/projectes',
        icon: 'table',
        label: 'Projectes'
      },
      {
        to: '/contacts',
        icon: 'account-box',
        label: 'Contactes'
      },
      {
        to: '/dedicacio',
        label: 'Hores dedicades',
        icon: 'calendar'
      },
      {
        to: '/working-day',
        icon: 'chart-timeline',
        label: 'Persones'
      },
      {
        to: '/tasks',
        icon: 'view-column',
        label: 'Tasques'
      },
      {
        href: `${process.env.VUE_APP_API_URL || 'http://localhost:1337'}/admin`,
        icon: 'open-in-new',
        label: 'Strapi'
      }
    ],
    'Diners',
    [
      {
        to: '/emitted-invoices',
        icon: 'import',
        label: 'Ingressos'
      },
      {
        to: '/received-invoices',
        icon: 'export',
        label: 'Despeses'
      },
      {
        to: '/salary',
        icon: 'table',
        label: 'Bestretes'
      },
      {
        to: '/tresoreria',
        icon: 'table',
        label: 'Tresoreria'
      },
      {
        to: '/quotes',
        icon: 'table',
        label: 'Pressupostos'
      }
    ],
    'Consulta dades',
    [
      {
        to: '/stats-projectes',
        icon: 'table',
        label: 'Projectes'
      },
      {
        to: '/dedicacio-charts',
        label: 'Dedicació',
        icon: 'chart-pie'
      },
      {
        to: '/stats-dedicacio',
        icon: 'table',
        label: 'Dedicació'
      },
      {
        to: '/stats-previsio-gantt',
        icon: 'chart-timeline',
        label: 'Previsió dedicació'
      },
      {
        to: '/stats-previsio-hores',
        icon: 'table',
        label: 'Prev./Real Dedicació'
      },
      {
        to: '/stats-economic-detail',
        icon: 'table',
        label: 'Ingressos/Despeses'
      },          
      {
        to: '/stats-estrategies',
        icon: 'table',
        label: 'Estratègies'
      },
      {
        to: '/stats-intercoop',
        icon: 'table',
        label: 'Intercooperació'
      },
      {
        to: '/dedicacio-saldo',
        icon: 'table',
        label: 'Saldo hores'
      },
      {
        to: '/dedicacio-summary',
        icon: 'table',
        label: 'Hores anuals'
      },
      {
        to: '/justifications',
        icon: 'table',
        label: 'Justificacions'
      }
    ],
    'Ajuda',
    [
      {
        to: '/documentacio',
        icon: 'help-circle',
        label: 'Documentació'
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