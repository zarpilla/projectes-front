// «IVA previst» (IVA screen): VAT of the projects' future incomes and expenses,
// by quarter. Each quarter deducts its year's «% IVA deduïble» (Taules
// auxiliars › Anys), Configuració's only as fallback — the API sets it on each
// quarter, as for executed VAT and the economic forecast (issues/221).
import moment from 'moment'

// The quarter's deductible %: the API's, Configuració's when it has none
export const quarterDeductiblePct = (quarter, configPct) => {
  const pct = quarter && quarter.deductible_vat_pct
  return pct === null || pct === undefined || pct === '' ? Number(configPct) || 0 : Number(pct)
}

const quarterDeductiblePaid = (quarter, configPct) =>
  (quarter.paid * quarterDeductiblePct(quarter, configPct)) / 100

// Quarters in order with the cumulative balance and the payment it creates —
// the same calculation as the API's «IVA previst pendent de saldar».
// Negative = VAT to pay, like the executed table (issues/072).
export const expectedVatQuarterRows = (byQuarter, configPct) => {
  const sorted = Object.keys(byQuarter || {})
    .map(key => ({ key, ...byQuarter[key] }))
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.quarter - b.quarter))

  let cumulativeBalance = 0
  return sorted.map(qData => {
    const deductiblePaid = quarterDeductiblePaid(qData, configPct)
    const quarterBalance = deductiblePaid - qData.received
    cumulativeBalance += quarterBalance

    // 30th of the month after the quarter; Q4 on January 20th
    const paymentDate = moment(`${qData.year}`, 'YYYY').quarter(qData.quarter).endOf('quarter').add(1, 'month')
    paymentDate.date(qData.quarter === 4 ? 20 : 30)

    const row = {
      year: qData.year,
      quarter: qData.quarter,
      received: qData.received,
      paid: qData.paid,
      deductible_pct: quarterDeductiblePct(qData, configPct),
      deductible_paid: deductiblePaid,
      quarterBalance,
      cumulativeBalance,
      paymentAmount: cumulativeBalance < 0 ? cumulativeBalance : 0,
      paymentDate: paymentDate.format('DD/MM/YYYY'),
      willCreateEntry: cumulativeBalance < 0
    }
    // reset after a payment (same as the API)
    if (cumulativeBalance < 0) cumulativeBalance = 0
    return row
  })
}

// The «Previst» totals: deductible supported VAT summed per quarter, its %
// (the quarters' when they share one, else the weighted one) and the balance.
export const expectedVatTotals = (vatExpected, byQuarter, configPct) => {
  const paid = (vatExpected && vatExpected.paid) || 0
  const received = (vatExpected && vatExpected.received) || 0
  const quarters = Object.values(byQuarter || {})
  const deductiblePaid = quarters.reduce((sum, q) => sum + quarterDeductiblePaid(q, configPct), 0)
  const pcts = [...new Set(quarters.map(q => quarterDeductiblePct(q, configPct)))]
  let deductiblePct = Number(configPct) || 0
  if (pcts.length === 1) deductiblePct = pcts[0]
  else if (pcts.length > 1 && paid) deductiblePct = (deductiblePaid / paid) * 100
  return {
    deductiblePaid,
    deductiblePct,
    balance: -1 * (received - deductiblePaid)
  }
}
