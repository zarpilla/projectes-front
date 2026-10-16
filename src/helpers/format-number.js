// Catalan number format of the redesign: "." for thousands (also in 4-digit
// numbers, like format-price.js), "," for decimals, "−" (minus sign) for negatives.
// Trailing zero decimals are dropped down to `minDecimals`.
export const formatNumber = (value, maxDecimals = 1, minDecimals = 0) => {
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return ''
  }
  let [integer, decimals = ''] = Math.abs(number).toFixed(maxDecimals).split('.')
  decimals = decimals.replace(/0+$/, '').padEnd(minDecimals, '0')
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const negative = number < 0 && (Number(integer.replace(/\./g, '')) > 0 || Number(decimals) > 0)
  return (negative ? '−' : '') + integer + (decimals ? ',' + decimals : '')
}

export const formatHours = (value) => formatNumber(value, 1) + ' h'

export const formatMoney = (value) => formatNumber(value || 0, 2, 2) + ' €'

// "pos" / "neg" / "zero", for colouring amounts (has-text-pos / has-text-neg)
export const sign = (value) => {
  const number = Math.round(Number(value || 0) * 100)
  return number > 0 ? 'pos' : number < 0 ? 'neg' : 'zero'
}

export default formatNumber
