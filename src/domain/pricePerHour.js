// "Preu hora" report: what an hour of each project costs once the overhead (the
// projects marked as structural expenses) is shared out by direct expenses, plus a
// margin. Same figures as the old PricePerHourDetail table:
//   direct   = -(expenses + their VAT)   (expenses are stored as negatives)
//   share    = direct / all direct expenses
//   indirect = share × overhead
//   price    = (direct + indirect) × (1 + margin %) / productive hours
//
// `groups` are the per-project sums of the report rows; `keys` say which of their
// fields to read (forecast or execution).

export const pricePerHour = (groups, { expense, vat, hours }, marginPercent) => {
  const margin = 1 + (Number(marginPercent) || 0) / 100
  const cost = g => (Number(g[expense]) || 0) + (Number(g[vat]) || 0)
  const projects = (groups || []).filter(g => g.structural_expenses !== true)
  const overheadProjects = (groups || []).filter(g => g.structural_expenses === true)

  const expenseTotal = projects.reduce((acc, g) => acc + cost(g), 0)
  const structuralTotal = overheadProjects.reduce((acc, g) => acc + cost(g), 0)
  const hoursTotal = projects.reduce((acc, g) => acc + (Number(g[hours]) || 0), 0)

  const rows = projects.map(g => {
    const direct = -cost(g)
    const share = expenseTotal ? cost(g) / expenseTotal : 0
    const indirect = -share * structuralTotal
    const h = Number(g[hours]) || 0
    return {
      id: g.id,
      name: g.project_name,
      scope: g.project_scope || '',
      state: g.project_state || '',
      direct,
      share,
      indirect,
      hours: h,
      price: h ? ((direct + indirect) * margin) / h : null
    }
  })

  return {
    rows,
    overhead: overheadProjects
      .map(g => ({ id: g.id, name: g.project_name, amount: -cost(g) }))
      .sort((x, y) => y.amount - x.amount),
    totals: {
      direct: -expenseTotal,
      indirect: -structuralTotal,
      hours: hoursTotal,
      price: hoursTotal ? ((-expenseTotal - structuralTotal) * margin) / hoursTotal : null,
      // indirect over direct expenses
      overheadRate: expenseTotal ? structuralTotal / expenseTotal : 0
    }
  }
}

// how many projects fall in each price band (projects without hours left out)
export const PRICE_BANDS = [
  { label: 'Menys de 25 €', max: 25 },
  { label: '25 – 30 €', max: 30 },
  { label: '30 – 40 €', max: 40 },
  { label: '40 – 60 €', max: 60 },
  { label: '60 – 100 €', max: 100 },
  { label: '100 € o més', max: Infinity }
]
export const priceBands = rows => PRICE_BANDS.map((band, i) => {
  const min = i ? PRICE_BANDS[i - 1].max : -Infinity
  return { label: band.label, count: rows.filter(r => r.price !== null && r.price >= min && r.price < band.max).length }
})
