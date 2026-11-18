// "Facturar": the delivered orders not invoiced yet, by member and month. The
// project of the quarter where the invoices go is the API's
// (auto-invoicing/quarter-project, issues/430), the same rule as the
// automatic invoicing.

const round2 = v => Math.round((v + Number.EPSILON) * 100) / 100;

// The price of an order as its invoice line computes it, the one formula of
// the order form, Facturar and the reports (issues/145, 057):
//   (price − volume discount €) × (1 + late surcharge % / 100)
//     × (1 − (multidelivery % + pickup %) / 100)
// rounded to cents; the surcharge of a late order (issues/315) is part of the
// base, rounded to cents too. The backend's copy is projectes-v5
// src/api/order/services/final-price.js (finalPrice, infoAll, invoice lines).
export const invoicedPrice = o => {
  const net = (Number(o.price) || 0) - (Number(o.volume_discount) || 0);
  const surcharge = o.late_order ? Number(o.late_surcharge) || 0 : 0;
  const base = surcharge ? round2(net * (1 + surcharge / 100)) : net;
  const discount = (Number(o.multidelivery_discount) || 0) + (Number(o.contact_pickup_discount) || 0);
  let amount = base * 1;
  if (discount) amount = amount * (1 - discount / 100.0);
  return round2(amount);
};

// A delivered order moved back from Facturada keeps its invoice link (240
// warns so): the backend's invoicing run skips it, so Facturar must neither
// list nor count it (issues/293).
export const linkedToInvoice = o => Boolean(o && o.emitted_invoice && (typeof o.emitted_invoice !== "object" || o.emitted_invoice.id));

// groups of member + month (YYYY-MM): newest month first, biggest amount first
export const groupOrders = orders => {
  const map = new Map();
  for (const o of orders) {
    if (!o.owner || linkedToInvoice(o)) continue;
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
