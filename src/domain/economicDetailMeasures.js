// The measures of the Ingressos/Despeses pivot for each «Totes / Previsió /
// Execució» choice. Changing the choice only redraws the pivot with these
// (issues/307: it asked the whole economic detail again).
const FORECAST = ['Resultat prev', 'Ingressos prev', 'Despeses tot prev', 'Despeses prev', 'Hores prev', 'Hores prev (h)']
const EXECUTED = ['Resultat exec', 'Ingressos exec', 'Despeses tot exec', 'Despeses exec', 'Hores exec', 'Hores exec (h)']
const ALL = [
  'Resultat orig',
  'Resultat prev',
  'Resultat exec',
  'Ingressos orig',
  'Ingressos prev',
  'Ingressos exec',
  'Despeses tot orig',
  'Despeses tot prev',
  'Despeses tot exec',
  'Despeses orig',
  'Despeses prev',
  'Despeses exec',
  'Hores orig',
  'Hores prev',
  'Hores exec',
  'Hores orig (h)',
  'Hores prev (h)',
  'Hores exec (h)'
]

export function economicDetailMeasures (dataType) {
  if (dataType === 'Previsió') return [...FORECAST]
  if (dataType === 'Execució') return [...EXECUTED]
  return [...ALL]
}
