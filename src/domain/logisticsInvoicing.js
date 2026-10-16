// "Facturar": the delivered orders not invoiced yet, by member and month, and
// the project of the quarter where the invoices go. The logistics projects are
// named in several ways ("3T 2026 - Logística", "Logística - 2025 - 2T",
// "Logística 2025 - 3T"…): a name with "logística", the year and "<n>T".

const normalize = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// { year, quarter } of a logistics project name, or null
export const projectQuarter = name => {
  const n = normalize(name);
  if (!n.includes("logistica")) return null;
  const year = n.match(/\b(20\d\d)\b/);
  const quarter = n.match(/\b([1-4])\s*t\b/);
  if (!year || !quarter) return null;
  return { year: Number(year[1]), quarter: Number(quarter[1]) };
};

export const quarterOf = month => {
  const [year, m] = month.split("-").map(Number);
  return { year, quarter: Math.ceil(m / 3) };
};

// the project of that quarter, and the latest logistics project
export const quarterProject = (projects, { year, quarter }) => {
  let match = null;
  let latest = null;
  for (const p of projects) {
    const q = projectQuarter(p.name);
    if (!q) continue;
    if (q.year === year && q.quarter === quarter && !match) match = p;
    const key = q.year * 10 + q.quarter;
    if (!latest || key > latest.key) latest = { key, project: p };
  }
  return { match, latest: latest ? latest.project : null };
};

// the price of an order as the invoice computes it (all its discounts)
export const invoicedPrice = o =>
  ((o.price || 0) - (o.volume_discount || 0)) *
  (1 - (o.multidelivery_discount || 0) / 100) *
  (1 - (o.contact_pickup_discount || 0) / 100);

// groups of member + month (YYYY-MM): newest month first, biggest amount first
export const groupOrders = orders => {
  const map = new Map();
  for (const o of orders) {
    if (!o.owner) continue;
    const month = String(o.estimated_delivery_date || "").slice(0, 7);
    const key = `${o.owner.id}-${month}`;
    if (!map.has(key)) map.set(key, { key, owner: o.owner, month, orders: [], count: 0, units: 0, kg: 0, amount: 0, discounts: 0 });
    const g = map.get(key);
    const price = invoicedPrice(o);
    g.orders.push(o.id);
    g.count += 1;
    g.units += Number(o.units) || 0;
    g.kg += Number(o.kilograms) || 0;
    g.amount += price;
    g.discounts += price - (o.price || 0);
  }
  return [...map.values()].sort((a, b) => (a.month === b.month ? b.amount - a.amount : a.month < b.month ? 1 : -1));
};
