// Kendo UI (the pivot reports) formats numbers in en-US by default: "20,262.51".
// The app writes them the Catalan way ("20.262,51", see format-number.js), so once
// Kendo is loaded we add a "ca-ES" culture (en-US with the separators swapped and
// euros) and make it the current one.
export const applyKendoCulture = (kendo = typeof window !== 'undefined' ? window.kendo : undefined) => {
  if (!kendo || !kendo.cultures || !kendo.culture) {
    return false
  }
  if (!kendo.cultures['ca-ES']) {
    const base = kendo.cultures['en-US']
    const swap = format => ({ ...format, ',': '.', '.': ',' })
    kendo.cultures['ca-ES'] = {
      ...base,
      name: 'ca-ES',
      numberFormat: {
        ...swap(base.numberFormat),
        percent: { ...swap(base.numberFormat.percent), pattern: ['-n %', 'n %'] },
        currency: { ...swap(base.numberFormat.currency), symbol: '€', pattern: ['-n $', 'n $'] }
      }
    }
  }
  kendo.culture('ca-ES')
  return true
}

export default applyKendoCulture
