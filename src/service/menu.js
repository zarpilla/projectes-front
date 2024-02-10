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
        to: '/registre-jornades',
        icon: 'clock',
        label: 'Registre Jornades'
      },
      {
        to: '/working-day',
        icon: 'account-multiple',
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
        icon: 'cash-multiple',
        label: 'Bestretes'
      },
      {
        to: '/tresoreria',
        icon: 'bank',
        label: 'Tresoreria'
      },
      {
        to: '/quotes',
        icon: 'calculator',
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
        to: '/forecast',
        icon: 'table',
        label: 'Previsió Econòmica'
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
      },
      {
        to: '/grants',
        icon: 'table',
        label: 'Subvencions'
      }
    ],
    'Ajuda',
    [
      {
        to: '/changelog',
        icon: 'math-log',
        label: 'Registre de canvis'
      },
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