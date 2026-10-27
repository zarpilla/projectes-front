// The logistics simulator (issues/361): what an order would cost, without
// saving it. Every step is the order form's own (assignRouteRate,
// orderRoutePrice, invoicedPrice, the late rules), so the quote can't drift
// from the price the same real order gets.
import moment from "moment";
import { assignRouteRate, assignRouteDate, orderRoutePrice, pickupIsFarm } from "@/service/assignRouteRate.js";
import { invoicedPrice } from "@/domain/logisticsInvoicing.js";
import { isLateDelivery, lateRules } from "@/domain/lateOrders.js";

const idOf = value => (value && typeof value === "object" ? value.id : value);

// The active routes that go through a town (the form's validCityRoutes), in
// the routes' order, each once.
export const townRoutes = (cityId, cityRoutes, routes) => {
  if (!cityId) return [];
  const ids = new Set(
    (cityRoutes || [])
      .filter(cr => cr && cr.city && cr.route && idOf(cr.city) === cityId)
      .map(cr => idOf(cr.route))
  );
  return (routes || []).filter(r => r && r.active !== false && ids.has(r.id));
};

// A warehouse whose town the route doesn't go through sends the boxes on a
// transfer first (the form's checkTransferNeeded). No price, only a notice.
export const transferNeeded = (warehouse, route, cityRoutes) => {
  if (!warehouse || !route || warehouse.pickup) return false;
  const cityId = idOf(warehouse.city);
  if (!cityId) return false;
  return !(cityRoutes || []).some(cr => cr && cr.city && cr.route && idOf(cr.city) === cityId && idOf(cr.route) === route.id);
};

// The first day the route can still take the order: the route's next open
// day, as the form proposes it.
export const quoteDate = (route, { ordersOptions = {}, closures = [], exempt = false } = {}) => {
  const o = ordersOptions || {};
  return assignRouteDate(route, {
    nextDayLimitHour: lateRules(o).nextDayLimitHour,
    workingDays: o.working_days,
    isAdmin: exempt,
    closures
  });
};

/**
 * The quote. `input`:
 *   route, date, kilograms, deliveryType (id), warehouse (pickup row),
 *   farmPickup (the farm pickup row when there is a pickup at the farm, else null)
 * `ctx`:
 *   routeRates, pickups, ownerId,
 *   pendingOrders: the member's pending orders on the route (a farm pickup
 *     already pending there takes the warehouses' rates, as in the form),
 *   sameDayOrders: the member's orders on the route that day (volume discount),
 *   otherOrderToPoint: the case of another order to the same delivery point
 *     that day (the multidelivery discount),
 *   multideliveryAllowed: the member's «Descompte multientrega» (false: none),
 *   ordersOptions, exempt (the office: no late surcharge), now
 */
export const quoteOrder = (input, ctx = {}) => {
  const { route, date, deliveryType, warehouse, farmPickup } = input;
  const kilograms = Number(input.kilograms) || 0;
  const o = ctx.ordersOptions || {};
  const pickup = farmPickup || warehouse || null;
  const form = {
    route: route && route.id,
    delivery_type: deliveryType || null,
    pickup: pickup ? pickup.id : null,
    owner: ctx.ownerId || null,
    collection_point: null,
    route_rate: null,
    status: "pending"
  };
  const rate = route ? assignRouteRate(form, ctx.routeRates || [], ctx.pendingOrders || [], ctx.pickups || []) : null;
  const price = rate ? orderRoutePrice(rate, { kilograms, lines: [] }) : 0;

  // the volume discount: this order and the member's others that day on the route
  const others = (ctx.sameDayOrders || []).filter(x => x && x.status !== "cancelled").length;
  const volumeOrders = Number(route && route.volume_discount_number_of_orders) || 0;
  const volumePrice = Number(route && route.volume_discount_price) || 0;
  const volume_discount = volumeOrders > 0 && volumePrice > 0 && others + 1 >= volumeOrders ? volumePrice : 0;

  const multideliveryPct = ctx.multideliveryAllowed === false ? 0 : Number(o.multidelivery_discount) || 0;
  const multidelivery_discount = ctx.otherOrderToPoint ? multideliveryPct : 0;

  const rules = lateRules(o);
  const late = Boolean(!ctx.exempt && date && isLateDelivery(date, ctx.now || new Date(), rules));
  const late_surcharge = late ? rules.lateSurcharge : 0;

  const order = {
    price,
    volume_discount,
    multidelivery_discount,
    contact_pickup_discount: 0,
    late_order: late,
    late_surcharge
  };
  return {
    rate,
    farmRates: Boolean(rate && farmPickup && pickupIsFarm(rate.pickup, { pickups: ctx.pickups })),
    price: Math.round(price * 100) / 100,
    volume: { discount: volume_discount, fromOrders: volumeOrders, amount: volumePrice, orders: others + 1 },
    multidelivery: { discount: multidelivery_discount, percent: multideliveryPct },
    late: { late, surcharge: late_surcharge },
    total: invoicedPrice(order),
    order
  };
};

// The rows of the quote export (.ods), label and value
export const quoteRows = (input, quote, { member = "", town = "", deliveryTypeName = "" } = {}) => {
  const money = v => Math.round((Number(v) || 0) * 100) / 100;
  const rows = [
    ["Sòcia", member],
    ["Població", town],
    ["Ruta", input.route ? input.route.name : ""],
    ["Data prevista", input.date ? moment(input.date).format("DD/MM/YYYY") : ""],
    ["Tipus de servei", deliveryTypeName],
    ["Magatzem d'origen", input.warehouse ? input.warehouse.name : ""],
    ["Recollida a finca", input.farmPickup ? "Sí" : "No"],
    ["Caixes", Number(input.units) || 0],
    ["Kg", Number(input.kilograms) || 0],
    ["Tarifa", quote.rate ? quote.rate.name : ""],
    ["Preu de la ruta (€)", money(quote.price)],
    ["Descompte per volum (€)", money(quote.volume.discount)],
    ["Descompte multientrega (%)", quote.multidelivery.discount],
    ["Recàrrec fora de temps (%)", quote.late.surcharge],
    ["Total sense IVA (€)", money(quote.total)]
  ];
  return rows.map(([concepte, valor]) => ({ concepte, valor }));
};
