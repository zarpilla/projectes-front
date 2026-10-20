// When an order takes the price of today's rates (the user's decision,
// 2026-10-20, issues/287): any order that is not invoiced is repriced when
// what its price depends on changes (kilos, boxes, route, delivery type,
// refrigerated, pickup, collection point, consumption-point lines); a save
// without such a change keeps its price, so new rate tables don't change old
// orders. A pending order is priced as before (always from the rates); an
// invoiced one, or one still on an invoice, keeps the price it was invoiced
// with; a farm collection order (-R) is priced from the orders it collects
// (the API, issues/292).
import { linkedToInvoice } from "@/domain/logisticsInvoicing";

const idOf = value => {
  const id = value && typeof value === "object" ? value.id : value;
  return id === undefined || id === null || id === "" ? null : Number(id);
};
const num = value => (value === undefined || value === null || value === "" ? null : Number(value));

// what the price of an order depends on
export const priceBasis = order => ({
  kilograms: num(order.kilograms),
  units: num(order.units),
  route: idOf(order.route),
  delivery_type: idOf(order.delivery_type),
  refrigerated: Boolean(order.refrigerated),
  pickup: idOf(order.pickup),
  collection_point: idOf(order.collection_point),
  lines: Array.isArray(order.lines) ? order.lines.length : 0
});

export const sameBasis = (a, b) => {
  const x = priceBasis(a);
  const y = priceBasis(b);
  return Object.keys(x).every(key => x[key] === y[key]);
};

export const isInvoicedOrder = order =>
  Boolean(order) && (order.status === "invoiced" || linkedToInvoice(order));

// whether `current` (the order being edited) takes the rates' price;
// `original` is the order as it was loaded (none for a new one)
export const repricesOrder = (original, current) => {
  if ((current && current.is_collection_order) || (original && original.is_collection_order)) return false;
  if (!original || !original.id) return true;
  if (isInvoicedOrder(original)) return false;
  if (original.status === "pending") return true;
  return !sameBasis(original, current);
};
