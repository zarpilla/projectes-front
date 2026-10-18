// What changed in the app, newest first (shown at "Registre de canvis" and,
// the latest entry, on the profile). `text` is a string or a list of strings and
// { to, label } links. `modules` says which parts of the app it touches, the
// main one first (one of CHANGELOG_MODULES, which follow the side menu).
// `type`: "Novetats" when you can now do something you couldn't before (a new
// screen, report, document, field to fill in or action); "Millores" when
// something you already did works better (faster, more filters or columns, an
// export, clearer, redesigned) and for technical changes nobody sees;
// "Correccions" when it didn't work as it should.
// "2026.10.20" → "20/10/2026", as the Registre de canvis and the profile show it
// (the profile printed "2026/10/20", issues/112)
export const changelogDate = date => {
  const [y, m, d] = String(date).split('.')
  return d ? `${d}/${m}/${y}` : date
}

export const CHANGELOG_MODULES = [
  "Projectes", "Hores", "Diners", "Subvencions", "Informes", "Logística",
  "Integracions", "Administració", "Plataforma"
]

export const CHANGELOG = [
{
  date: "2026.10.20",
  items: [
    {
      type: "Millores",
      modules: ["Plataforma", "Diners"],
      text: "Nou disseny de tota l'aplicació: menú lateral per seccions, capçaleres amb les accions de cada pantalla, xifres destacades, filtres en una sola barra, taules més clares i fitxes per apartats amb una barra de desar sempre visible. Les factures emeses es mostren en mode de només lectura, amb Verifactu i FACe al costat."
    },
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Les adreces de l'aplicació ja no porten «#»: ara són com …/stats/projectes. Els enllaços antics (correus, codis QR de les etiquetes, adreces desades) continuen funcionant."
    },
    {
      type: "Novetats",
      modules: ["Plataforma"],
      text: ["Mode fosc: tria'l a ", { to: "/profile", label: "el teu perfil" }, " (Clar, Fosc o com el sistema). Es guarda en aquest navegador."]
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: ["Al mòbil, el calendari d'", { to: "/dedicacio", label: "Hores dedicades" }, " mostra la suma de cada dia i, a sota, la llista del mes per dies amb el nom sencer de cada projecte. Tocant un dia, la llista hi salta; tocant una entrada, s'obre per canviar-la."]
    },
    {
      type: "Novetats",
      modules: ["Administració", "Projectes", "Logística"],
      text: ["A ", { to: "/admin/me", label: "Configuració general" }, " ara es poden canviar les opcions que fins ara només configurava qui manté el servidor: la despesa indirecta als projectes, la tresoreria, el cost/hora a la planificació, el % d'IVA deduïble, les quotes de Seguretat Social i les tarifes de les dietes i, amb logística, el descompte multientrega i l'hora límit. Les tarifes de ruta es gestionen a ", { to: "/admin/route-rate", label: "Taules auxiliars › Tarifes de ruta" }, "."]
    },
    {
      type: "Novetats",
      modules: ["Administració", "Integracions"],
      text: ["A ", { to: "/admin/me", label: "Configuració general" }, ", nou apartat «Integracions» amb l'adreça i la clau del directori DIR3 i del lector de PDF (les claus no es tornen a mostrar). L'«Adreça de l'aplicació» és ara la que fan servir els enllaços dels correus, els codis QR de les comandes i els pressupostos. A la fitxa de cada usuària es pot posar el seu calendari iCal."]
    },
    {
      type: "Novetats",
      modules: ["Logística"],
      text: ["L'oficina de logística ja pot crear rutes, canviar-ne els dies, el repartidor, les transferències i el descompte per volum, i desactivar-les, a ", { to: "/routes", label: "Rutes i punts › Rutes" }, ". Una ruta desactivada no surt en fer comandes ni a Rutes i dies; les comandes que ja la tenen la mantenen."]
    },
    {
      type: "Novetats",
      modules: ["Hores", "Administració"],
      text: ["Festius de tothom (Festiu Estatal, Festiu Catalunya): les persones administradores els poden afegir, canviar i esborrar des del botó «Festiu» de ", { to: "/dedicacio", label: "Hores dedicades" }, "; la resta els veu en només lectura. Els tipus de festiu es gestionen a ", { to: "/admin/festive-type", label: "Taules auxiliars › Tipus de festiu" }, "."]
    },
    {
      type: "Novetats",
      modules: ["Informes"],
      text: ["Nou informe ", { to: "/invoicing-forecast", label: "Previsió facturació" }, ": què cal facturar aquest mes i els propers, i què s'havia de facturar i encara no té factura, per projecte i responsable. Surt de la «Previsió fac.» de les línies d'ingrés de cada projecte."]
    },
    {
      type: "Millores",
      modules: ["Logística", "Informes"],
      text: ["Els informes ", { to: "/orders-stats", label: "de comandes" }, " i ", { to: "/incidences-stats", label: "d'incidències" }, " tenen gràfics damunt la taula dinàmica: comandes, import i quilos per dia, mes o any, ruta, sòcia, punt de recollida i tarifa; i incidències per període, per sòcia, qui les obre, quant es triga a tancar-les i les rutes amb més incidències per cada 100 comandes."]
    },
    {
      type: "Millores",
      modules: ["Logística"],
      text: ["Logística redissenyada: ", { to: "/orders", label: "comandes" }, " agrupades per ruta i per dia, la vista de cada comanda amb el seu recorregut i seguiment, ", { to: "/order-operations", label: "operacions" }, " pensades per al mòbil, ", { to: "/incidences", label: "incidències" }, " amb la conversa al costat i ", { to: "/orders-invoice", label: "facturar" }, " amb el projecte del trimestre."]
    },
    {
      type: "Millores",
      modules: ["Logística"],
      text: [{ to: "/city-route", label: "Poblacions i rutes" }, " es fa d'una altra manera: cada ruta amb les seves poblacions, i «Quina ruta passa per…?» per trobar les rutes d'una població."]
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: ["L'informe ", { to: "/stats-economic-detail", label: "Ingressos i despeses" }, " comença amb gràfics: ingressos, despeses i hores per mes (o per any) amb el resultat acumulat, el resultat de cada projecte i on van les despeses. Segueixen els filtres de la pàgina (amb «Totes», l'executat amb el previst al costat)."]
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: ["L'informe ", { to: "/stats-projectes", label: "Projectes" }, " també comença amb gràfics: el resultat previst i el real de cada projecte, les hores fetes contra les previstes i el resultat per àmbit o per qui coordina."]
    },
    {
      type: "Millores",
      modules: ["Informes", "Hores"],
      text: ["Un sol informe de ", { to: "/stats-dedicacio", label: "Dedicació" }, " en lloc de tres (Dedicació gràfic, Dedicació taula i Prev./Real): hores previstes i fetes per mes, per persona i per projecte, per tipus de dedicació i per funció, amb la taula dinàmica a sota. El cost de les hores només el veuen les persones amb accés a Projectes."]
    },
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: ["El ", { to: "/changelog", label: "Registre de canvis" }, " es pot filtrar per mòdul (Projectes, Hores, Diners, Subvencions, Informes, Logística, Integracions, Administració i Plataforma), i cada canvi indica els mòduls que toca."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["El «Peu de les comandes» de ", { to: "/admin/me", label: "Configuració general" }, " ara surt al peu de cada albarà, sota les dades de l'entitat. Abans no s'imprimia enlloc."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["A ", { to: "/provider-invoices", label: "Factures" }, " de la sòcia, el subtítol diu el nom de l'entitat (deia «l'entitat») i la columna dels projectes es diu «Projecte» (deia «Ruta»)."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["A l'", { to: "/orders-stats", label: "informe de comandes" }, " el total diu «caixes» (deia «bultos») i els avisos dels punts de consum diuen «línia» (deien «línea»). L'assumpte dels correus d'incidències, del resum de tasques i del formulari de contacte escrivia ESSTRAPIS amb una S de més."]
    },
    {
      type: "Correccions",
      modules: ["Projectes"],
      text: ["La taula de ", { to: "/mother-projects", label: "Projectes mare" }, " (i la de Projectes amb l'estat «Tots») ja hi cap sencera en una pantalla de 1440 px: la columna «Estat» quedava tallada a la dreta. Els àmbits llargs ocupen dues línies."]
    }
  ]
},
{
  date: "2026.10.18",
  items: [
    {
      type: "Millores",
      modules: ["Logística"],
      text: ["Quan algú respon una ", { to: "/incidences", label: "incidència" }, ", reben el correu l'oficina de logística i la sòcia de la comanda, però no qui ha escrit la resposta. El correu diu qui ha escrit cada resposta."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["Les dates de transferència i de recollida tenen en compte tots els dies de la ruta (no només el primer) i se salten els dies tancats a «Rutes i dies». Les comandes mogudes amb «Unificar» abans d'avui recuperen l'adreça del punt d'entrega on són ara."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["El preu amb descomptes d'una comanda és el mateix a la ", { to: "/orders", label: "llista de comandes" }, ", a la fitxa, a ", { to: "/orders-invoice", label: "Facturar" }, " i a la factura. La tarifa de ruta es tria bé quan n'hi ha més d'una o la comanda es recull a qualsevol magatzem, i l'edició ràpida ja no desa una comanda sense preu."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: [{ to: "/orders-invoice", label: "Facturar" }, " demana confirmació abans de crear factures i només factura les files marcades del mes que es veu. Esborrar l'esborrany també treu l'ingrés que havia afegit al projecte. El concepte de la factura porta el mes de lliurament, i les sòcies no veuen les factures en esborrany."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["Una sòcia només pot anul·lar les seves comandes pendents: ja no pot tornar a «Pendent» una comanda processada o lliurada. A ", { to: "/deposits", label: "Dipòsits" }, " es veuen totes les comandes, no només les 50 primeres, i l'escàner no diposita una comanda lliurada, facturada o anul·lada."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["La «Comanda punt de consum» conserva les línies en triar la recollida. Després de l'hora límit, la comanda va al següent dia de ruta de la mateixa setmana, i el recordatori diu l'hora configurada. Si no es pot desar, es diu per què."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["Desar una ruta a ", { to: "/routes", label: "Rutes" }, " ja no n'esborra la destinació de les transferències. A ", { to: "/transfers", label: "Transferències" }, " els comptadors de cada pestanya són bons i les transferències tenen destinació. «Unificar» punts d'entrega actualitza les dades del punt a les comandes i permet esborrar el punt duplicat; canviar el punt a l'edició ràpida també les actualitza."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["Les respostes de les ", { to: "/incidences", label: "incidències" }, " diuen qui les ha escrit, «En procés» ja no compta com a tancada a l'informe, i els comptadors de la llista segueixen la cerca i el filtre de sòcia."]
    },
    {
      type: "Correccions",
      modules: ["Diners", "Informes"],
      text: ["Les dates dels moviments de la ", { to: "/tresoreria", label: "Tresoreria" }, " surten com 20/10/2026. A les taules dinàmiques dels informes, les capçaleres de les files desplegades arriben fins a l'última fila de valors."]
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: ["«Exporta detall» d'", { to: "/stats-economic-detail", label: "Ingressos i despeses" }, " inclou la previsió de facturació i la previsió de pagament de cada línia del pressupost."]
    },
    {
      type: "Correccions",
      modules: ["Informes"],
      text: ["«Exporta detall» d'", { to: "/stats-economic-detail", label: "Ingressos i despeses" }, " té les columnes «iva_pct» i «iva» amb l'IVA de cada moviment, ingressos inclosos. Les columnes que abans es deien «…_vat» (i «Despeses … iva» a les exportacions de totals) ara es diuen «…_iva_no_deduible» («Despeses … IVA no deduïble»): són només l'IVA no deduïble, que és 0 si l'IVA es dedueix tot. Els totals dels projectes i la ", { to: "/tresoreria", label: "Tresoreria" }, " (pagaments i cobraments previstos i l'IVA previst) ja fan servir l'IVA de cada línia del pressupost, no el del tipus."]
    },
    {
      type: "Correccions",
      modules: ["Projectes"],
      text: ["A la fitxa del ", { to: "/projectes", label: "projecte" }, ", passar d'un projecte a un altre sense recarregar ja no arrossega la periodificació, els totals ni l'any del resum de l'anterior. Un codi que ja existeix es diu en català al costat del camp «Codi», i esborrar un projecte explica que va a la paperera."]
    },
    {
      type: "Millores",
      modules: ["Projectes"],
      text: [{ to: "/mother-projects", label: "Projectes mare" }, " té la mateixa taula que Projectes: clienta sota el nom, barra d'hores, resultats en color, fila de totals, filtre per àmbit i el nombre de projectes a la capçalera."]
    },
    {
      type: "Millores",
      modules: ["Projectes", "Plataforma"],
      text: "Els diàlegs de confirmació tenen els botons en català («Cancel·la», «D'acord»; en sortir amb canvis sense desar, «Continua editant» i «Surt sense desar»). «Divideix la línia» del pressupost explica què fa cada botó (×2 repeteix la línia cada mes, ÷2 reparteix l'import) i «Cancel·la» ja no queda amagat. El cost/hora de la planificació i de la jornada surt com 21,55 €."
    }
  ]
},
{
  date: "2026.10.17",
  items: [
    {
      type: "Correccions",
      modules: ["Plataforma"],
      text: "Cada pàgina només s'obre amb el permís del seu apartat del menú: qui no el té (per exemple, una sòcia de logística o una persona que només registra hores) va a la seva pàgina d'inici. En entrar, cadascú arriba a la seva pàgina, i les novetats ja no enllacen pàgines que no pot obrir."
    },
    {
      type: "Correccions",
      modules: ["Informes", "Hores"],
      text: ["El ", { to: "/stats-projectes", label: "panell de projectes" }, " ja no compta els projectes esborrats. Al ", { to: "/registre-jornades", label: "registre de jornades" }, " es marca en vermell un tram amb la sortida abans de l'entrada; ", { to: "/salary", label: "bestretes" }, " no ofereix crear nòmines mentre falti la jornada laboral; i la ", { to: "/invoicing-forecast", label: "previsió de facturació" }, " ja no compta «—» com una persona."]
    },
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Més dates i números amb el format català: totes les dates dels calendaris (05/02/2026), la vista «Taula» de les hores (1,00 h), els documents de la fitxa del projecte, el detall per dies de bestretes i saldo d'hores, els quilos de les comandes i el nombre de contactes (1.053). Les hores del resum del projecte porten sempre dos decimals, i la previsió econòmica d'un sol any ja no diu «2026–2026»."
    },
    {
      type: "Correccions",
      modules: ["Projectes", "Diners"],
      text: ["A la fitxa del ", { to: "/projectes", label: "projecte" }, ", «Cobraments i pagaments» torna a llistar les factures, ingressos i despeses lligats al projecte a «Moviments d'ingressos i despeses», i també els que no estan assignats a cap línia del pressupost."]
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: "Passar d'un document a un altre de tipus diferent (d'una factura a un pressupost, o tornar enrere) ja no deixa la pàgina en blanc ni mostra un altre document."
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: ["La vista prèvia i el PDF de les ", { to: "/emitted-invoices", label: "factures" }, " i dels ", { to: "/quotes", label: "pressupostos" }, " tornen a portar el logo de l'entitat."]
    },
    {
      type: "Correccions",
      modules: ["Logística", "Projectes"],
      text: ["La fitxa d'un ", { to: "/contacts", label: "contacte" }, " amb data d'aportació de sòcia es tornava a obrir buida: ara es veu i es pot editar."]
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: ["El PDF dels ", { to: "/quotes", label: "pressupostos" }, " mostra l'IRPF quan alguna línia en té, i el total el descompta com a les factures. També hi surt la data del pressupost i els preus amb format."]
    },
    {
      type: "Correccions",
      modules: ["Informes"],
      text: [{ to: "/stats-previsio-hores", label: "Previsió i execució de la dedicació" }, " compta les hores previstes com el panell de projectes (dies feiners, festius i només línies amb persona), i els totals coincideixen. A la llista de projectes, el «Resultat previst» és el mateix que al panell."]
    },
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Diversos textos corregits: «Província», «Línies», «Clients», «Sortir», «Nou projecte», «Factures FACe», dates de pagament, venciment, enviament i acceptació en minúscula, i singulars quan n'hi ha un (1 bloquejat, 1 sòcia, 1 projecte d'estructura)."
    },
    {
      type: "Correccions",
      modules: ["Plataforma"],
      text: "Més números amb el format català: les hores del calendari d'hores dedicades i del detall dels gràfics de dedicació (114,99 h), els quilos de transferències i dipòsits, els percentatges de l'IVA (97,96 %) i els imports i hores dels projectes mare."
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: ["A ", { to: "/tresoreria", label: "tresoreria" }, ", els moviments sense data surten com a «Sense data» (abans «Invalid date»), el gràfic ja no ratlla el títol quan tots els mesos són negatius i el text de «Saldo avui» ja no comença amb «-,»."]
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: "Les factures i despeses sense línies (sobretot les importades del sistema anterior) mostren el total desat a la capçalera i a les línies, en lloc de 0,00 €. A la vista de la factura, un import de 0 surt com a 0,00 € i no com a «-»."
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: "A la vista de les factures i dels pressupostos, el bloc del client (o del proveïdor) ara mostra sempre el nom, també quan el document no en té les dades desades i es prenen del contacte."
    },
    {
      type: "Correccions",
      modules: ["Hores"],
      text: "Hores dedicades, Registre jornades, Bestretes, Saldo hores, Hores anuals i Tasques tornen a obrir-se amb la teva persona triada al filtre «Persona», també després de recarregar la pàgina."
    },
    {
      type: "Correccions",
      modules: ["Hores"],
      text: ["A ", { to: "/dedicacio", label: "hores dedicades" }, ", les hores registrades sense projecte ara surten al calendari i compten als totals del dia, de la setmana i del mes, com a «Sense projecte»."]
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: ["A ", { to: "/dedicacio", label: "hores dedicades" }, " la pàgina s'obre amb el calendari (la vista «Tot» feia una pàgina molt llarga), i si no hi ha cap persona triada no es carreguen les hores de tothom: tria una persona o «Totes»."]
    },
    {
      type: "Correccions",
      modules: ["Diners", "Integracions"],
      text: "Els totals de factures, despeses, ingressos i pressupostos sumen cada línia ja arrodonida als cèntims, tal com es mostra i com s'envia a FACe. Abans la base podia diferir d'un cèntim de la suma de les línies. Els documents existents no canvien fins que es tornen a desar."
    },
    {
      type: "Correccions",
      modules: ["Administració"],
      text: ["A ", { to: "/admin/me", label: "Configuració general" }, ", ara es pot buidar un camp (per exemple un peu de factura) o tornar a deixar un compte bancari sense triar. Abans el valor antic es mantenia en desar."]
    },
    {
      type: "Millores",
      modules: ["Logística"],
      text: ["La pàgina ", { to: "/order-operations", label: "Operacions" }, " s'obre molt més de pressa: només demana les comandes i transferències de les rutes de la repartidora i del dia triat, i no totes les comandes."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["En una comanda, tancar un dia a «Rutes i dies» per a una ruta ja no fa que la data surti com a no vàlida a les altres rutes. La data de lliurament que es proposa automàticament (també en importar un CSV) se salta els dies en què la ruta està tancada."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["A ", { to: "/orders", label: "comandes" }, ", si es tria «Última milla» juntament amb altres estats (Ctrl+clic), ara surten les comandes de tots, i no només les que compleixen tot alhora. La fitxa d'una comanda en un estat poc habitual (última milla, dipositada…) el mostra amb el seu nom."]
    },
    {
      type: "Correccions",
      modules: ["Projectes"],
      text: "A la fitxa del projecte, la pestanya de moviments mostra sempre les targetes d'ingressos i despeses i de cobraments i pagaments, amb un avís si encara no n'hi ha cap (abans no sortien). Als projectes mare, les hores surten amb el format de la resta de l'aplicació."
    },
    {
      type: "Correccions",
      modules: ["Projectes"],
      text: "A les fases del projecte, l'avís «Imports diferents» d'una línia lligada a una factura o a un ingrés/despesa s'actualitza quan es desa el projecte. Abans només es calculava en desar el document, i si després es canviaven les línies quedava desfasat. Una diferència d'un cèntim ja no surt com a avís."
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: ["El ", { to: "/registre-jornades", label: "registre de jornades" }, ", el saldo d'hores i les bestretes s'obren més de pressa: només demanen els festius del període que mostren, no els de tots els anys."]
    },
    {
      type: "Millores",
      modules: ["Plataforma", "Administració"],
      text: "Les llistes que gairebé no canvien (estats, tipus i àmbits de projecte, anys, tipus de dedicació, d'IVA…) es carreguen un sol cop per sessió, i les pantalles s'obren més de pressa. Si en canvies una a «Taules auxiliars», ho veus al moment; la resta d'usuàries, quan tornin a entrar o recarreguin la pàgina."
    },
    {
      type: "Correccions",
      modules: ["Hores"],
      text: ["A ", { to: "/dedicacio", label: "hores dedicades" }, ", mentre es desa «Fi de l'activitat» el botó queda desactivat. Abans, si es tornava a clicar perquè tardava, es podia desar l'activitat dues vegades."]
    }
  ]
},
{
  date: "2026.10.15",
  items: [
    {
      type: "Correccions",
      modules: ["Hores"],
      text: ["A ", { to: "/dedicacio", label: "hores dedicades" }, ", en fer «Continua» al comptador es perdia la Funció triada (i també el tipus de dedicació i la tasca). Ara es guarden i hi són quan el tornes a obrir."]
    },
    {
      type: "Correccions",
      modules: ["Projectes", "Diners"],
      text: "A «Assignació de documents» (fases del projecte i tresoreria), en triar un tiquet ara es buiden la factura rebuda i la dieta, com ja passava amb els altres camps: cada línia queda lligada a un sol document."
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: ["A les ", { to: "/received-invoices", label: "despeses" }, ", el botó «Cancel·lar» de «Nova Dieta» no feia res. Ara tanca la finestra i et deixa a la despesa nova."]
    },
    {
      type: "Correccions",
      modules: ["Hores"],
      text: ["A ", { to: "/dedicacio", label: "hores dedicades" }, ", si es tancava la finestra d'entrada d'hores clicant fora o amb Esc, ja no s'obria més fins a recarregar la pàgina: ni per afegir hores a mà, ni per aturar el comptador, ni per modificar una entrada. Ara es torna a obrir sempre. També passava amb altres finestres de l'aplicació."]
    },
    {
      type: "Correccions",
      modules: ["Hores"],
      text: ["A ", { to: "/dedicacio", label: "hores dedicades" }, ", en aturar el comptador («Fi de l'activitat») les hores es desaven a 0. Ara es desa el temps que ha estat en marxa."]
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: ["Algunes factures rebudes desades a finals de setembre sortien amb l'import doble a la llista de ", { to: "/received-invoices", label: "despeses" }, " i als informes. Ara mostren l'import correcte de les seves línies."]
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: ["A les dietes de ", { to: "/received-invoices", label: "despeses" }, ", els botons de cada línia (també el d'afegir-ne una de nova) quedaven fora de la pantalla. Ara les línies s'ajusten a l'amplada i els botons sempre es veuen."]
    }
  ]
},
{
  date: "2026.10.14",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: ["Ara es pot triar el compte bancari de cada nòmina o bestreta (per defecte, el de nòmines). A ", { to: "/tresoreria", label: "Tresoreria" }, " la bestreta surt al compte triat."]
    },
    {
      type: "Correccions",
      modules: ["Hores"],
      text: ["A l'entrada d'", { to: "/dedicacio", label: "hores dedicades" }, ", es torna a poder triar la funció del projecte (per exemple Licitacions o Propostes) i es guarda amb les hores."]
    },
    {
      type: "Correccions",
      modules: ["Projectes"],
      text: "La fitxa del projecte ja no es penja en guardar-la sense «Àmbit territorial» o sense «Tipus de dedicació», ni quan no es pot guardar perquè hi falta alguna dada obligatòria."
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: "La vista per imprimir d'una factura o d'un pressupost ja no falla quan l'entitat encara no té logo."
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["A les ", { to: "/orders-stats", label: "estadístiques de comandes" }, " i d'incidències, triar «Tots» els anys amb un mes mostra aquell mes de tots els anys, en lloc de fallar o no mostrar res."]
    }
  ]
},
{
  date: "2026.10.12",
  items: [
    {
      type: "Correccions",
      modules: ["Logística"],
      text: ["A la ", { to: "/orders", label: "llista de comandes" }, ", les caselles per seleccionar comandes tornen a marcar-se."]
    },
    {
      type: "Correccions",
      modules: ["Logística"],
      text: "El botó «Imprimeix PDF» de les comandes torna a funcionar. El PDF torna a mostrar també les caixes de les recollides i la ruta amb els punts de transferència."
    },
    {
      type: "Correccions",
      modules: ["Projectes"],
      text: "Al pressupost dels projectes, les despeses d'un tipus de despesa amb 0% d'IVA (per exemple «Ma d'obra») ja no sumen un 21% d'IVA. Els tipus «Quotes», «Comissions bancàries» i «Ajustament salarial final d'any», que no tenien IVA indicat, passen a tenir un 0%; un tipus de despesa sense IVA indicat continua comptant un 21%. Els totals dels projectes afectats es recalculen sols."
    },
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Les descàrregues de dades (botó «Exporta dades» de les taules i estadístiques, comandes, Ecologística i Contasol) ara són fulls de càlcul en format obert OpenDocument (.ods), que s'obren amb LibreOffice, OpenOffice i Microsoft Excel. Els números hi van com a números, amb tots els decimals, i ja no depenen del camp «Decimal Excel» de la usuària."
    }
  ]
},
{
  date: "2026.10.11",
  items: [
    {
      type: "Correccions",
      modules: ["Plataforma"],
      text: ["Els botons d'opció no seleccionats tornen a mostrar el text: a la fitxa d'una ", { to: "/orders", label: "comanda" }, " (Ruta, Tipus de servei, Punt de recollida, Estat), als contactes i als filtres de tresoreria i estadístiques es veien en blanc."]
    },
    {
      type: "Millores",
      modules: ["Logística", "Administració"],
      text: ["Les pàgines ", { to: "/incidences", label: "Incidències" }, ", ", { to: "/pickup-points", label: "Punts de recollida" }, " i ", { to: "/admin/users", label: "Usuàries" }, " tenen un botó per exportar la llista a Excel. A Incidències i Usuàries el fitxer porta totes les files, no només la pàgina que es veu."]
    },
    {
      type: "Millores",
      modules: ["Logística"],
      text: ["La pàgina ", { to: "/partners", label: "Sòcies" }, " té un botó per exportar la llista de sòcies a Excel."]
    },
    {
      type: "Novetats",
      modules: ["Administració", "Logística"],
      text: ["Administració d'usuàries: des de la fitxa d'una usuària a ", { to: "/admin/users", label: "Usuàries" }, " es pot posar-li una contrasenya nova i, amb el permís Logística (Admin), activar o desactivar el seu descompte multientrega."]
    }
  ]
},
{
  date: "2026.10.10",
  items: [
    {
      type: "Millores",
      modules: ["Projectes"],
      text: "Guardar un projecte amb moltes hores dedicades, i assignar-hi una factura o una despesa, torna a ser ràpid: en els projectes més grans passa de més de 7 segons a mig segon."
    },
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: ["Les pàgines carreguen menys dades: els projectes, les factures i les taules dinàmiques de ", { to: "/stats-projectes", label: "Projectes" }, " i ", { to: "/stats-dedicacio", label: "Dedicació" }, " s'obren més de pressa, sobretot amb connexions lentes."]
    }
  ]
},
{
  date: "2026.10.09",
  items: [
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Nova versió de la interfície: l'aplicació passa de Vue 2 a Vue 3 (amb les noves versions de Buefy i Bulma). Es veu igual, però és més ràpida i està al dia."
    },
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Nou desplegament: cada entitat funciona en contenidors Docker darrere d'un servidor Caddy, i les actualitzacions es fan sense aturar el servei."
    },
    {
      type: "Correccions",
      modules: ["Administració"],
      text: "Administració d'usuàries: les noves usuàries reben el rol Authenticated per defecte i ja no cal triar-lo perquè es puguin crear."
    },
    {
      type: "Correccions",
      modules: ["Administració"],
      text: "Administració: les pantalles de Comptes bancaris i de Regions tornen a obrir-se."
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: "El botó + (Nou Contacte) de les factures i despeses torna a obrir sempre un contacte nou, també des d'un document ja guardat."
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: "Els pressupostos tornen a guardar-se amb els seus imports (base, IVA i total); els que s'havien guardat a zero es recalculen."
    },
    {
      type: "Correccions",
      modules: ["Plataforma"],
      text: "Torna a funcionar «He oblidat la clau de pas»: rebràs el correu amb l'enllaç per canviar-la."
    },
    {
      type: "Correccions",
      modules: ["Administració"],
      text: "Només les persones administradores poden crear usuàries o canviar-ne els permisos, el rol o l'estat."
    },
    {
      type: "Novetats",
      modules: ["Plataforma"],
      text: "Nou enllaç Tiquets al menú lateral (a Altres): obre el web de tiquets, ja identificat amb el teu usuari, per comunicar errors, millores i suggeriments."
    },
    {
      type: "Correccions",
      modules: ["Projectes", "Hores"],
      text: "Les hores executades dels projectes tornen a calcular-se amb el cost/hora de cada persona i s'actualitzen en afegir, modificar o eliminar dedicacions."
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: ["Després de visitar ", { to: "/tresoreria", label: "Tresoreria" }, " ja es pot tornar a navegar a altres pàgines quan hi ha moviments bancaris sense projecte."]
    },
    {
      type: "Correccions",
      modules: ["Diners"],
      text: ["La columna Concepte de la llista d'", { to: "/emitted-invoices", label: "ingressos" }, " i la seva exportació a Excel tornen a mostrar el concepte de cada factura."]
    },
    {
      type: "Millores",
      modules: ["Projectes"],
      text: "Els projectes avisen de les línies d'ingrés o despesa sense data. A la periodificació, els seus imports surten a la fila \"Sense data\" en lloc de l'any 9999."
    }
  ]
},
{
  date: "2026.09.26",
  items: [
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Nova versió del servidor: l'aplicació passa de Strapi 3 a Strapi 5. Totes les entitats s'han migrat amb les seves dades; els dies següents es van corregir els detalls que van sortir."
    }
  ]
},
{
  date: "2026.07.16",
  items: [
    {
      type: "Novetats",
      modules: ["Informes", "Hores"],
      text: ["Nova taula de dedicació real amb gràfic de Gantt, que mostra les hores dedicades a projectes per persona i per setmana ", { to: "/stats-real-gantt", label: "% Dedicació real" }]
    }
  ]
},
{
  date: "2026.07.06",
  items: [
    {
      type: "Novetats",
      modules: ["Integracions", "Diners"],
      text: "Nova funcionalitat per a la creació de factures de proveïdores i despeses a partir de lectura automàtica de PDFs."
    }
  ]
},
{
  date: "2026.06.05",
  items: [
    {
      type: "Novetats",
      modules: ["Integracions"],
      text: "Integració amb FACe per a l'enviament automàtic de factures electròniques a l'Administració Pública."
    },
    {
      type: "Novetats",
      modules: ["Administració"],
      text: "Noves pàgines d'administració per gestionar la configuració del sistema i els paràmetres globals."
    }
  ]
},
{
  date: "2026.05.12",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Nova funcionalitat per validar moviments de tresoreria reals."
    },
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Nova funcionalitat per exportar i importar contactes en format CSV."
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: ["Afegida la periodificació a la taula de ", { to: "/forecast", label: "previsió econòmica" }, "."]
    }
  ]
},
{
  date: "2026.04.22",
  items: [
    {
      type: "Correccions",
      modules: ["Projectes"],
      text: "Correcció d'errors en esborrar hores planificades al gantt de projecte."
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: ["Possibilitat de descarregar el ", { to: "/registre-jornades", label: "registre de jornades" }, " anual."]
    }
  ]
},
{
  date: "2026.04.15",
  items: [
    {
      type: "Millores",
      modules: ["Projectes"],
      text: "Millores en la gestió i visualització de projectes mare, amb una nova vista de llistat i una nova vista de fitxa de projecte mare."
    }
  ]
},
{
  date: "2026.02.15",
  items: [
    {
      type: "Millores",
      modules: ["Projectes"],
      text: "Nou assistent per passos en la creació de projectes."
    }
  ]
},
{
  date: "2026.02.09",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Possibiltat d'afegir moviments de tresoreria de saldo real per compte bancari."
    },
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Nou càlcul de previsions a partir de les fases d'execució al resum financer de projectes. Nova columna de pressupost original."
    },
    {
      type: "Millores",
      modules: ["Projectes", "Diners"],
      text: "Millores en l'assignació de documents a projectes: Assignació semiautomàtica i millor detecció d'imports mal assignats tenint en compte documents assignats a varis projectes."
    },
    {
      type: "Novetats",
      modules: ["Subvencions"],
      text: "Assignació de justificacions a previsions."
    }
  ]
},
{
  date: "2026.02.02",
  items: [
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Nou logo"
    },
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Calculs trimestrals d'IVA a tresoreria"
    }
  ]
},
{
  date: "2026.01.26",
  items: [
    {
      type: "Millores",
      modules: ["Projectes"],
      text: "Millores en projectes mare, per calcular i visualitzar les dades dels projectes fills."
    },
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Afegits filtres a tresoreria"
    },
    {
      type: "Millores",
      modules: ["Subvencions"],
      text: "Millores al mòdul de justificacions"
    }
  ]
},
{
  date: "2025.12.10",
  items: [
    {
      type: "Millores",
      modules: ["Hores"],
      text: "Calendari de festius del 2026 carregat."
    },
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Millores al formulari de dietes."
    }
  ]
},
{
  date: "2025.11.28",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Múltiples comptes bancaris"
    },
    {
      type: "Novetats",
      modules: ["Subvencions"],
      text: "Justificació de subvencions anual"
    },
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Nou formulari per facilitar la introducció de dietes"
    },
    {
      type: "Millores",
      modules: ["Administració"],
      text: "No es poden esborrar persones usuàries que tenen dades associades (hores, jornades, documents…)."
    },
    {
      type: "Correccions",
      modules: ["Hores"],
      text: "Correccions a la importació d'hores a partir de calendaris"
    }
  ]
},
{
  date: "2025.11.20",
  items: [
    {
      type: "Millores",
      modules: ["Hores"],
      text: "La importació d'hores des de calendaris ja no importa els esdeveniments que has rebutjat."
    },
    {
      type: "Millores",
      modules: ["Logística", "Integracions"],
      text: "Logística: les comandes noves prenen una forma de pagament per defecte i els descomptes de les comandes s'envien correctament a Verifactu."
    }
  ]
},
{
  date: "2025.11.03",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: ["Nova pantalla d'", { to: "/vat", label: "IVA" }, ": suportat, repercutit, deduïble i saldo, executat i previst, i la llista de documents pendents de saldar, que es poden saldar indicant la data de pagament."]
    }
  ]
},
{
  date: "2025.10.21",
  items: [
    {
      type: "Novetats",
      modules: ["Integracions"],
      text: ["Exportació a ", { to: "/contasol", label: "Contasol" }, ": factures, proveïdors i efectes a pagar, per portar-los al programa de comptabilitat."]
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: "Millores al gantt de dedicacions."
    }
  ]
},
{
  date: "2025.10.07",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Possibilitat de desactivar àmbits de projecte."
    },
    {
      type: "Novetats",
      modules: ["Logística"],
      text: "Logística: notes d'entrega als punts d'entrega, visibles a les comandes."
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: "En importar hores des del calendari, el tipus de dedicació es detecta pel nom de l'esdeveniment."
    }
  ]
},
{
  date: "2025.09.24",
  items: [
    {
      type: "Novetats",
      modules: ["Subvencions"],
      text: "Nou mòdul de justificacions de subvencions, amb la possibilitat de justificar les despeses d'estructura amb factures."
    }
  ]
},
{
  date: "2025.09.19",
  items: [
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Quan hi ha una versió nova de l'aplicació, es carrega sola o t'ho avisa, sense haver de buidar la memòria cau del navegador."
    }
  ]
},
{
  date: "2025.09.18",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Nou camp de tipus de projecte a la fitxa de projecte."
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: "La importació de calendaris iCal permet importar esdeveniments recurrents."
    },
    {
      type: "Correccions",
      modules: ["Informes"],
      text: "Correcció de camps buits a la taula dinàmica d'ingressos i despeses."
    },
    {
      type: "Correccions",
      modules: ["Projectes"],
      text: "Ja no es mostren anys 9999 en projectes amb periodificació, sempre que totes les fases tinguin dates assignades."
    }
  ]
},
{
  date: "2025.09.12",
  items: [
    {
      type: "Novetats",
      modules: ["Informes"],
      text: "Possibilitat de definir vistes personalitzades a les taules dinàmiques."
    },
    {
      type: "Novetats",
      modules: ["Logística"],
      text: "Logística: descompte per volum a les comandes, que se suma als de multientrega i recollida. La factura mostra la base sense descompte, el descompte i el preu final."
    },
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Les factures en PDF de més d'una pàgina repeteixen la capçalera de la taula de línies."
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: "Millores de rendiment en la visualització de dades d'ingressos i despeses i preus/hora."
    }
  ]
},
{
  date: "2025.09.02",
  items: [
    {
      type: "Millores",
      modules: ["Logística"],
      text: "Logística: el descompte de multientrega es calcula automàticament en desar la comanda, i es pot analitzar a l'estadística de comandes."
    }
  ]
},
{
  date: "2025.08.02",
  items: [
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Millores de rendiment en la visualització de factures amb més de 50 línies."
    },
    {
      type: "Millores",
      modules: ["Logística"],
      text: "Logística: la llista de comandes carrega més ràpid."
    }
  ]
},
{
  date: "2025.07.16",
  items: [
    {
      type: "Novetats",
      modules: ["Logística"],
      text: ["Logística: comandes de ", { to: "/pickup-points", label: "punts de recollida" }, ", amb una línia per destinatari (caixes, quilos, nom i NIF) i els totals calculats automàticament, i descompte per recollida en finca."]
    },
    {
      type: "Millores",
      modules: ["Logística"],
      text: "Logística: la llista de comandes s'adapta al mòbil."
    }
  ]
},
{
  date: "2025.07.07",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Notes internes a les factures, que no surten al document, a més de les notes visibles."
    },
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Les factures en esborrany es poden editar directament."
    }
  ]
},
{
  date: "2025.06.28",
  items: [
    {
      type: "Novetats",
      modules: ["Integracions", "Diners"],
      text: "Adaptació a normativa VERIFACTU."
    },
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Nova funcionalitat per crear factures rectificatives a partir de factures emeses."
    },
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Factures en esborrany: es poden desar i modificar fins que es validen i s'emeten amb número."
    },
    {
      type: "Millores",
      modules: ["Logística"],
      text: "Logística: totals a la llista de comandes."
    }
  ]
},
{
  date: "2025.05.21",
  items: [
    {
      type: "Novetats",
      modules: ["Logística"],
      text: "Logística: descomptes de multientrega a les comandes i noves tarifes per ruta."
    },
    {
      type: "Novetats",
      modules: ["Logística"],
      text: "Logística: en entrar, avís si tens factures pendents de pagar, i data de facturació a cada comanda."
    }
  ]
},
{
  date: "2025.03.20",
  items: [
    {
      type: "Millores",
      modules: ["Logística"],
      text: "Logística: la fitxa dels punts d'entrega demana les dades imprescindibles (NIF, telèfon, adreça) i l'horari d'entrega en dos trams."
    },
    {
      type: "Millores",
      modules: ["Logística"],
      text: "Logística: millores al PDF de les comandes."
    }
  ]
},
{
  date: "2025.03.07",
  items: [
    {
      type: "Millores",
      modules: ["Projectes", "Logística"],
      text: ["Exportació dels ", { to: "/contacts", label: "contactes" }, " i dels punts d'entrega a CSV."]
    }
  ]
},
{
  date: "2025.02.26",
  items: [
    {
      type: "Novetats",
      modules: ["Hores"],
      text: ["Saldo d'hores anual i saldo d'hores a avui a ", { to: "/dedicacio-saldo", label: "saldo hores" }, "."]
    }
  ]
},
{
  date: "2025.02.09",
  items: [
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Millores de rendiment a l'actualitzar projectes i factures."
    },
    {
      type: "Millores",
      modules: ["Logística"],
      text: "Logística: filtres a la llista de comandes, ara molt més ràpida amb moltes comandes."
    }
  ]
},
{
  date: "2025.01.29",
  items: [
    {
      type: "Millores",
      modules: ["Logística"],
      text: "Logística: notes dels contactes visibles a les comandes."
    }
  ]
},
{
  date: "2024.11.26",
  items: [
    {
      type: "Novetats",
      modules: ["Hores"],
      text: ["Es permet modificar la distribució setmanal d'hores treballades a les jornades de ", { to: "/working-day", label: "persones." }]
    }
  ]
},
{
  date: "2024.09.19",
  items: [
    {
      type: "Correccions",
      modules: ["Diners"],
      text: ["Correcció dels saldos d'inici d'any per anys que no son l'actual a la ", { to: "/tresoreria", label: "taula de tresoreria." }]
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: ["Incorporació del camp 'projecte mare' a la taula dinàmica ", { to: "/stats-economic-detail", label: "d'ingressos i despeses." }]
    }
  ]
},
{
  date: "2024.10.07",
  items: [
    {
      type: "Millores",
      modules: ["Hores"],
      text: ["Millora en la velocitat de càrrega del calendari de ", { to: "/dedicacio", label: "dedicacions." }]
    }
  ]
},
{
  date: "2024.10.07",
  items: [
    {
      type: "Millores",
      modules: ["Informes", "Diners"],
      text: ["Filtre múltiple d'estats de projectes a ", { to: "/stats-economic-detail", label: "Detall d'ingressos i despeses" }, ", ", { to: "/tresoreria", label: "Tresoreria" }, " i ", { to: "/forecast", label: "Previsió Econòmica" }, "."]
    }
  ]
},
{
  date: "2024.09.06",
  items: [
    {
      type: "Novetats",
      modules: ["Hores"],
      text: "Es permet l'entrada d'hores dedicades a projectes des del registre de jornades."
    },
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Nous camps de tipus de contacte, import aportació i data de seguiment a la fitxa de contacte."
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: "Petites correccions a la vista mòbil d'entrada d'hores dedicades."
    }
  ]
},
{
  date: "2024.06.28",
  items: [
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: ["Canvi de nom, a partir d'ara: ", { tag: "b", text: "ESS" }, "TRAPIS"]
    }
  ]
},
{
  date: "2024.06.11",
  items: [
    {
      type: "Millores",
      modules: ["Informes"],
      text: ["Nou camp d'", { tag: "b", text: "Hores previstes avui" }, " a la ", { to: "/stats-previsio-hores", label: "taula dinámica de dedicació" }, "."]
    }
  ]
},
{
  date: "2024.06.06",
  items: [
    {
      type: "Novetats",
      modules: ["Hores"],
      text: "Possibilitat de triar a quins estats de projecte es poden assignar hores, no només a actius."
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: ["Camp subvencionable a ", { to: "/stats-economic-detail", label: "taula dinàmica d'ingressos i despeses." }]
    },
    {
      type: "Millores",
      modules: ["Subvencions"],
      text: ["Nous camps al ", { to: "/grants", label: "llistat de subvencions." }]
    }
  ]
},
{
  date: "2024.05.31",
  items: [
    {
      type: "Millores",
      modules: ["Hores"],
      text: "Millores en la importació d'hores des de calendaris .ics amb claudàtors."
    }
  ]
},
{
  date: "2024.05.30",
  items: [
    {
      type: "Millores",
      modules: ["Projectes"],
      text: ["Filtres a la taula de ", { to: "/contacts", label: "contactes" }, "."]
    },
    {
      type: "Novetats",
      modules: ["Subvencions"],
      text: "Nous camps per a subvencions a la fitxa de projecte: Número d'expedient, Entitat líder i Agrupada."
    },
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Data de previsió de cobrament a factures i ingressos"
    }
  ]
},
{
  date: "2024.05.27",
  items: [
    {
      type: "Novetats",
      modules: ["Informes"],
      text: ["Nou mòdul (experimental) per al càlcul del ", { to: "/price-hour", label: "preu/hora" }, " dels serveis."]
    }
  ]
},
{
  date: "2024.05.15",
  items: [
    {
      type: "Millores",
      modules: ["Diners"],
      text: ["Possibilitat de visualització de ", { to: "/tresoreria", label: "tresoreria" }, " per anys."]
    }
  ]
},
{
  date: "2024.05.06",
  items: [
    {
      type: "Correccions",
      modules: ["Informes"],
      text: ["Corregits colors de les ", { to: "/dedicacio-charts", label: "gràfiques de dedicació" }, ", que en alguns casos no corresponia amb la llegenda."]
    }
  ]
},
{
  date: "2024.04.30",
  items: [
    {
      type: "Novetats",
      modules: ["Administració", "Subvencions"],
      text: 'Camp "CCC" a l\'organització. Camp "NAF" (número d\'afiliació a la SS) a les persones. Camp "Despeses indirectes" a la secció de subvencions dels projectes.'
    },
    {
      type: "Novetats",
      modules: ["Logística"],
      text: "Check múltiple de canvi de'stat al mòdul de comandes i logística. Algunes correccions i millores."
    }
  ]
},
{
  date: "2024.04.18",
  items: [
    {
      type: "Novetats",
      modules: ["Logística"],
      text: "Nou mòdul de comandes i logística."
    }
  ]
},
{
  date: "2024.04.16",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Previsions de tresoreria d'IVA amb prorata."
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: ["Totals per dia a ", { to: "/registre-jornades", label: "registre de jornades" }, "."]
    },
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Els ingressos i despeses es guarden amb la seva corresponent prorrata d'IVA al saldar-se."
    }
  ]
},
{
  date: "2024.03.27",
  items: [
    {
      type: "Millores",
      modules: ["Hores"],
      text: ["Generació de PDFs de ", { to: "/registre-jornades", label: "registre de jornades" }, " per mesos."]
    },
    {
      type: "Millores",
      modules: ["Diners"],
      text: ["Filtre de cobrat/pagat a ", { to: "/emitted-invoices", label: "ingressos" }, " i ", { to: "/received-invoices", label: "despeses" }, "."]
    },
    {
      type: "Millores",
      modules: ["Projectes"],
      text: "Subtotals per fases al detall de projectes."
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: ["Filtre de projectes actius i tancats al ", { to: "/stats-economic-detail", label: "detall d'ingressos i despeses" }, "."]
    },
    {
      type: "Novetats",
      modules: ["Subvencions"],
      text: "Afegida data de justificació als projectes subvencionables."
    },
    {
      type: "Correccions",
      modules: ["Hores"],
      text: "Solucionat error amb l'importació de calendaris .ics"
    }
  ]
},
{
  date: "2024.03.21",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Enviament de factures de clientes per correu electrònic."
    },
    {
      type: "Novetats",
      modules: ["Diners"],
      text: ["Funcionalitat per saldar l'IVA amb prorrata a ", { to: "/tresoreria", label: "tresoreria" }, "."]
    },
    {
      type: "Millores",
      modules: ["Diners"],
      text: ["Camp de número de factura de proveïdora al llistat de ", { to: "/received-invoices", label: "despeses" }, "."]
    },
    {
      type: "Novetats",
      modules: ["Hores"],
      text: ["Generació de PDFs de ", { to: "/registre-jornades", label: "registre de jornades" }, "."]
    },
    {
      type: "Novetats",
      modules: ["Hores"],
      text: "Es permet definir un calendari (en format .ical) per a tota l'organització per tal d'importar automàticament dedicacions, a part de tenir calendaris per persona com fins ara."
    }
  ]
},
{
  date: "2024.01.10",
  items: [
    {
      type: "Novetats",
      modules: ["Plataforma"],
      text: "Nova secció de registre de canvis (aquesta)."
    },
    {
      type: "Novetats",
      modules: ["Subvencions"],
      text: ["El mòdul de ", { to: "/justifications", label: "justificacions" }, " es pot consultar també en funció de les hores previstes, a més a més de les reals."]
    },
    {
      type: "Correccions",
      modules: ["Hores"],
      text: ["A les ", { to: "/working-day", label: "jornades de persones" }, ", s'agafa l'últim dia del més com a data final en nous períodes."]
    }
  ]
},
{
  date: "2023.12.20",
  items: [
    {
      type: "Novetats",
      modules: ["Hores"],
      text: "Integració automàtica amb calendaris iCal: les hores dels esdeveniments es poden importar com a dedicació sense haver de pujar el fitxer."
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: ["Filtres a la taula dinàmica ", { to: "/stats-economic-detail", label: "d'ingressos i despeses" }, "."]
    }
  ]
},
{
  date: "2023.11.23",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Projectes d'estructura, per recollir les despeses i hores que no són d'un projecte concret."
    },
    {
      type: "Millores",
      modules: ["Hores", "Projectes"],
      text: "Resum de la càrrega de feina diària a les dedicacions, i cerca exacta de projectes."
    }
  ]
},
{
  date: "2023.10.09",
  items: [
    {
      type: "Millores",
      modules: ["Projectes"],
      text: "La fitxa de projecte mostra els documents assignats, amb enllaç a cadascun."
    }
  ]
},
{
  date: "2023.09.22",
  items: [
    {
      type: "Novetats",
      modules: ["Informes"],
      text: ["Resum de ", { to: "/forecast", label: "previsió econòmica" }, " dels projectes."]
    }
  ]
},
{
  date: "2023.07.24",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Periodificació de projectes: els ingressos i despeses es reparteixen entre els anys que dura el projecte, tant els reals com els previstos."
    }
  ]
},
{
  date: "2023.07.06",
  items: [
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Pressupostos amb productes, i dades bàsiques del client a la fitxa de projecte."
    }
  ]
},
{
  date: "2023.06.16",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Gestió de productes a les factures i pressupostos emesos."
    },
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Generació de les factures en PDF des de l'aplicació, amb el logo de l'entitat i el peu de factura o de pressupost."
    }
  ]
},
{
  date: "2023.06.08",
  items: [
    {
      type: "Millores",
      modules: ["Projectes"],
      text: "Totals per any als projectes i data estimada dels documents."
    }
  ]
},
{
  date: "2023.05.23",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Cost real per persona i any."
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: "Descàrrega de les hores a Excel amb totals, i la dedicació ja no es mostra en dies festius."
    }
  ]
},
{
  date: "2023.05.16",
  items: [
    {
      type: "Novetats",
      modules: ["Hores"],
      text: ["Nou ", { to: "/registre-jornades", label: "registre de jornades" }, ": entrada i sortida de cada dia de feina."]
    }
  ]
},
{
  date: "2023.03.01",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Dietes amb retenció d'IRPF."
    },
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Exportació de les factures rebudes a CSV amb les línies, i persona usuària vinculada als contactes."
    }
  ]
},
{
  date: "2023.02.07",
  items: [
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Les nòmines i els seus pagaments surten a tresoreria."
    }
  ]
},
{
  date: "2023.01.24",
  items: [
    {
      type: "Millores",
      modules: ["Projectes", "Plataforma"],
      text: "Els càlculs dels projectes es fan en segon pla: desar un projecte o un document és molt més ràpid."
    }
  ]
},
{
  date: "2023.01.16",
  items: [
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Creació de totes les nòmines del mes d'un sol cop, amb els camps calculats protegits."
    }
  ]
},
{
  date: "2022.12.19",
  items: [
    {
      type: "Novetats",
      modules: ["Subvencions"],
      text: ["Llista de ", { to: "/grants", label: "subvencions" }, " i camps de subvencionable i documents a la fitxa de projecte."]
    },
    {
      type: "Millores",
      modules: ["Hores", "Informes"],
      text: "Les dedicacions es vinculen al calendari, i el detall d'ingressos i despeses es pot exportar a Excel per any."
    }
  ]
},
{
  date: "2022.11.14",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Documents en PDF, i filtre per trimestre a les llistes."
    },
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Taula dinàmica de tresoreria amb l'estat de pagament."
    }
  ]
},
{
  date: "2022.10.19",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: ["Anotacions manuals a ", { to: "/tresoreria", label: "tresoreria" }, "."]
    },
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Adjunts als projectes, i botó «Desa i surt»."
    }
  ]
},
{
  date: "2022.09.26",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Dietes, i pujada de fitxers als documents (factures, ingressos i despeses)."
    },
    {
      type: "Novetats",
      modules: ["Projectes", "Subvencions"],
      text: "Import subvencionable i valors per defecte als projectes nous."
    }
  ]
},
{
  date: "2022.09.05",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Fases d'execució amb dates, separades del pressupost original."
    },
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Exportacions a Excel amb més camps i amb el format de decimals que triï cada persona."
    }
  ]
},
{
  date: "2022.07.26",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes", "Informes"],
      text: ["Preu per hora dels projectes, i hores al detall d'", { to: "/stats-economic-detail", label: "ingressos i despeses" }, "."]
    },
    {
      type: "Millores",
      modules: ["Diners"],
      text: "Exportació a Excel de la llista d'ingressos i despeses."
    }
  ]
},
{
  date: "2022.07.18",
  items: [
    {
      type: "Novetats",
      modules: ["Hores"],
      text: "Importació d'hores des de calendaris iCal."
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: "Tipus d'hores a les dedicacions previstes, i festius de diversos dies d'un sol cop."
    }
  ]
},
{
  date: "2022.06.08",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Es guarden les fases del pressupost original per comparar-les amb l'execució."
    },
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Un document es pot repartir entre diverses línies de projecte, i avís per correu a les persones implicades en una tasca."
    }
  ]
},
{
  date: "2022.05.24",
  items: [
    {
      type: "Novetats",
      modules: ["Informes"],
      text: ["Taula dinàmica de detall d'", { to: "/stats-economic-detail", label: "ingressos i despeses" }, "."]
    },
    {
      type: "Millores",
      modules: ["Hores", "Plataforma"],
      text: "Dedicació setmanal amb totals per setmana, i avís abans de sortir d'un formulari amb canvis sense desar."
    }
  ]
},
{
  date: "2022.05.10",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Tresoreria anual, tenint en compte les factures rectificatives."
    }
  ]
},
{
  date: "2022.04.05",
  items: [
    {
      type: "Novetats",
      modules: ["Subvencions"],
      text: ["Mòdul de ", { to: "/justifications", label: "justificacions" }, " de projectes, per hores i per quantitat, amb exportació a CSV."]
    },
    {
      type: "Novetats",
      modules: ["Diners", "Projectes"],
      text: "Factures i pressupostos en català i castellà, i noves tasques assignades a una persona i una activitat."
    }
  ]
},
{
  date: "2022.03.29",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: ["Gestió de ", { to: "/tasks", label: "tasques" }, " dels projectes, amb llista de comprovació i imatges."]
    },
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Liquidació de l'IVA a tresoreria."
    }
  ]
},
{
  date: "2022.03.17",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: [{ to: "/quotes", label: "Pressupostos" }, " dels projectes."]
    }
  ]
},
{
  date: "2022.03.09",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Projectes mare, i documents assignats a diversos projectes."
    },
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Camp de territori als projectes."
    }
  ]
},
{
  date: "2022.03.01",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: ["Nòmines i pagaments de nòmines a ", { to: "/salary", label: "salaris" }, "."]
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: "Resum d'hores i de la feina feta avui."
    }
  ]
},
{
  date: "2022.02.16",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Ingressos rebuts i despeses de projecte, a més de les factures."
    },
    {
      type: "Millores",
      modules: ["Informes"],
      text: "Tipus de dedicació a la taula dinàmica d'hores, i resultats dels projectes tenint en compte els documents no assignats."
    }
  ]
},
{
  date: "2022.02.02",
  items: [
    {
      type: "Novetats",
      modules: ["Hores"],
      text: [{ to: "/working-day", label: "Jornades" }, " de les persones i resum anual d'hores, ajustat a les hores diàries de cada jornada."]
    },
    {
      type: "Novetats",
      modules: ["Hores"],
      text: "Festius generals i personals, visibles al gantt de dedicacions."
    }
  ]
},
{
  date: "2022.01.27",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: ["Factures dels projectes: ", { to: "/emitted-invoices", label: "emeses" }, " i ", { to: "/received-invoices", label: "rebudes" }, "."]
    },
    {
      type: "Novetats",
      modules: ["Diners"],
      text: "Salaris i cotitzacions de cada persona, per calcular el cost per hora."
    }
  ]
},
{
  date: "2022.01.10",
  items: [
    {
      type: "Novetats",
      modules: ["Hores"],
      text: "Gantt de dedicacions per persona."
    },
    {
      type: "Millores",
      modules: ["Projectes"],
      text: "Millores de rendiment en la càrrega de projectes."
    }
  ]
},
{
  date: "2021.11.27",
  items: [
    {
      type: "Novetats",
      modules: ["Hores"],
      text: "Comptador de temps per registrar les hores mentre treballes."
    }
  ]
},
{
  date: "2021.11.23",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Gestió dels tipus d'activitat, i repartiment del pressupost."
    },
    {
      type: "Millores",
      modules: ["Projectes"],
      text: "Filtres per àmbit."
    }
  ]
},
{
  date: "2021.11.03",
  items: [
    {
      type: "Millores",
      modules: ["Diners", "Projectes"],
      text: "Exportació a Excel de la tresoreria i dels projectes."
    }
  ]
},
{
  date: "2021.10.26",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Nou gantt de projecte, amb subfases i hores previstes a les fases."
    },
    {
      type: "Millores",
      modules: ["Hores"],
      text: "Cost per hora a partir de les dedicacions diàries."
    }
  ]
},
{
  date: "2021.10.07",
  items: [
    {
      type: "Novetats",
      modules: ["Diners"],
      text: ["Control de ", { to: "/tresoreria", label: "tresoreria" }, " a partir de les fases dels projectes."]
    },
    {
      type: "Novetats",
      modules: ["Plataforma"],
      text: [{ to: "/documentacio", label: "Documentació" }, " d'ajuda dins l'aplicació."]
    }
  ]
},
{
  date: "2021.09.25",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Ingressos i despeses a les fases del projecte."
    },
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "L'aplicació avisa quan hi ha una versió nova."
    }
  ]
},
{
  date: "2021.09.13",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Fases de projecte, amb gantt i cost de les hores."
    }
  ]
},
{
  date: "2021.07.05",
  items: [
    {
      type: "Millores",
      modules: ["Plataforma"],
      text: "Exportació a CSV, i hores amb decimals amb coma."
    }
  ]
},
{
  date: "2021.06.09",
  items: [
    {
      type: "Novetats",
      modules: ["Informes"],
      text: "Taula dinàmica de projectes per any, i despeses indirectes."
    },
    {
      type: "Novetats",
      modules: ["Projectes"],
      text: "Contactes i intercooperació."
    }
  ]
},
{
  date: "2021.06.01",
  items: [
    {
      type: "Novetats",
      modules: ["Diners", "Projectes"],
      text: "Factures, amb peu de factura configurable, i estats de projecte."
    }
  ]
},
{
  date: "2021.05.21",
  items: [
    {
      type: "Novetats",
      modules: ["Projectes", "Hores"],
      text: "Primera versió: projectes, hores dedicades i quadres de comandament de projectes."
    }
  ]
}
      ]

export default CHANGELOG
