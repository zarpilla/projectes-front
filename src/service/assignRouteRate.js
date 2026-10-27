import moment from "moment";
import { isLateDelivery, lateRules } from "@/domain/lateOrders.js";

const idOf = value => (value && typeof value === "object" ? value.id : value);

// The pickup flag of a pickup point: true for a farm pickup (the driver collects
// the boxes), false for a warehouse the member brings them to. Read from the
// pickup object itself, the `pickups` list or the pickups the rates carry;
// without any of them, the ids the app was written for (1 Magatzem Girona,
// 2 Recollida en Finca).
const pickupIsFarm = (pickup, { pickups = [], routeRates = [] } = {}) => {
  if (pickup === null || pickup === undefined) return false;
  if (typeof pickup === "object" && typeof pickup.pickup === "boolean") return pickup.pickup;
  const id = idOf(pickup);
  const known =
    (pickups || []).find(p => p && p.id === id) ||
    (routeRates || []).map(r => r && r.pickup).find(p => p && typeof p === "object" && p.id === id);
  if (known && typeof known.pickup === "boolean") return known.pickup;
  return id === 2;
};

// The rate of an order: the rates of its route (or of every route), of its
// delivery type (or of any), and of its kind of pickup -- the farm's own rates
// for a farm pickup (unless the member already has a farm pickup pending on
// that route, or the boxes go through a collection point), the warehouses'
// rates otherwise. Several matches resolve deterministically: the rate of the
// very pickup point first, then the route-specific one, then the one of the
// delivery type, then the lowest id (issues/151).
const assignRouteRate = (form, routeRates, orders, pickups = []) => {
  const pickup = idOf(form.pickup);
  const route = idOf(form.route);
  const delivery_type = idOf(form.delivery_type);
  const owner = idOf(form.owner);
  const collection_point = idOf(form.collection_point);

  if (form.route_rate === null || form.status !== "invoiced") {
    const ctx = { pickups, routeRates };
    const routesOf = r => (Array.isArray(r.routes) ? r.routes : []);

    let farmRates = false;
    if (!collection_point && pickupIsFarm(form.pickup, ctx)) {
      const pendingFarmOrders = (orders || []).filter(
        o =>
          o &&
          idOf(o.pickup) === pickup &&
          o.status === "pending" &&
          o.id !== form.id &&
          idOf(o.route) === route &&
          idOf(o.owner) === owner
      );
      farmRates = pendingFarmOrders.length === 0;
    }

    const rates = (routeRates || []).filter(r => {
      if (!r) return false;
      const routes = routesOf(r);
      if (routes.length && !routes.some(rt => idOf(rt) === route)) return false;
      if (r.delivery_type && idOf(r.delivery_type) !== delivery_type) return false;
      if (!r.pickup) return true;
      return farmRates ? idOf(r.pickup) === pickup : !pickupIsFarm(r.pickup, ctx);
    });

    const rank = r => [
      r.pickup && idOf(r.pickup) === pickup ? 0 : 1,
      routesOf(r).length ? 0 : 1,
      r.delivery_type ? 0 : 1,
      Number(r.id) || 0
    ];
    rates.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
      return 0;
    });

    form.route_rate = rates[0];
  }
  return form.route_rate;
};

// A route closure (route-festive) closes its own route; one without a route
// closes them all. Closing one route made the date invalid for every route
// (issues/082).
const isRouteClosed = (route, day, closures = []) => {
  const date = day.format("YYYY-MM-DD");
  return (closures || []).some(
    f => f.date === date && (!f.route || !route || idOf(f.route) === route.id)
  );
};

// The delivery date proposed for a new order: the first open route day after
// today. Past the next-day cutoff tomorrow was skipped for the next route day
// (issues/150), which put late orders among next week's; it is kept now and
// the order is late (`late`, issues/315): the member is warned and pays the
// surcharge, or picks a later day. Admins are exempt. The deadline is the
// limit of the working day before (workingDays, lateOrders.js): on the weekend
// a Monday is late too.
const assignRouteDate = (route, options = {}) => {
  const { nextDayLimitHour = 14, workingDays = null, isAdmin = false, closures = [] } = options;
  const routeDaysOfWeek = [];
  if (route.monday) routeDaysOfWeek.push(1);
  if (route.tuesday) routeDaysOfWeek.push(2);
  if (route.wednesday) routeDaysOfWeek.push(3);
  if (route.thursday) routeDaysOfWeek.push(4);
  if (route.friday) routeDaysOfWeek.push(5);
  if (route.saturday) routeDaysOfWeek.push(6);
  if (route.sunday) routeDaysOfWeek.push(0); // Sunday is 0 in day()
  // a route day, not closed for this route; a year of closures at most
  const isOpenDay = day =>
    routeDaysOfWeek.includes(day.day()) && !isRouteClosed(route, day, closures);
  const firstOpenDayAfter = from => {
    const day = from.clone();
    for (let i = 0; i < 366; i++) {
      day.add(1, "day");
      if (isOpenDay(day)) return day;
    }
    return day;
  };

  const today = moment().startOf("day");
  let nextDay = firstOpenDayAfter(today);
  let warning = "";
  let late = false;

  const rules = lateRules({ next_day_limit_hour: nextDayLimitHour, working_days: workingDays });
  if (!isAdmin && isLateDelivery(nextDay, moment(), rules)) {
    late = true;
    const when = nextDay.isSame(today.clone().add(1, "day"), "day") ? "demà" : nextDay.format("dddd");
    warning =
      `Vas tard per ${when}: les comandes s'han d'informar abans de les ${nextDayLimitHour} h del dia laborable anterior. ` +
      `Si la deixes per ${when} serà una comanda fora de temps i pot portar recàrrec. Si no és urgent, tria un altre dia de la ruta.`;
  } else if (
    routeDaysOfWeek.includes(today.day()) &&
    nextDay.diff(today, "days") >= 7
  ) {
    // today's route has left and the route doesn't run again until next week
    warning =
      "Ruta tancada per avui. Se t'assignarà la mateixa ruta però de la setmana vinent ja. Recorda portar el paquet.";
  }

  // the time of day as before (the form saves nextDay.toDate())
  const now = moment();
  nextDay.set({ hour: now.hour(), minute: now.minute(), second: now.second(), millisecond: now.millisecond() });
  return { nextDay, warning, late };
};

const checkIfDateIsValidInroute = (route, date, routeFestives) => {
  if (isRouteClosed(route, date, routeFestives)) {
    return false;
  }
  // no route chosen yet: only the closures can say no (issues/258)
  if (!route) {
    return true;
  }
  const routeDayOfWeek = [];
  if (route.monday) {
    routeDayOfWeek.push(1);
  }
  if (route.tuesday) {
    routeDayOfWeek.push(2);
  }
  if (route.wednesday) {
    routeDayOfWeek.push(3);
  }
  if (route.thursday) {
    routeDayOfWeek.push(4);
  }
  if (route.friday) {
    routeDayOfWeek.push(5);
  }
  if (route.saturday) {
    routeDayOfWeek.push(6);
  }
  if (route.sunday) {
    routeDayOfWeek.push(0); // Sunday is 0 in day()
  }
  if (routeDayOfWeek.includes(date.day())) {
    return true;
  }

  return false;
};

const calculateRoutePrice = (routeRate, kilos, pickupLines) => {
  let price = 0;
  if (routeRate && routeRate.ratev2 !== true) {
    if (kilos < 15) {
      price = routeRate.less15;
    } else if (kilos < 30) {
      price = routeRate.less30;
    } else {
      price = routeRate.less30 + (kilos - 30) * routeRate.additional30;
    }
  }
  if (routeRate && routeRate.ratev2 === true) {
    if (kilos < 10) {
      price = routeRate.less10;
    } else if (kilos >= 10 && kilos <= 20) {
      // Linear interpolation between more10 (at 10kg) and from10to20 (at 20kg)
      const t = (kilos - 10) / 10;
      price = routeRate.more10 + t * (routeRate.from10to20 - routeRate.more10);
    } else if (kilos > 20 && kilos <= 30) {
      // Linear interpolation between from10to20 (at 20kg) and from20to30 (at 30kg)
      const t = (kilos - 20) / 10;
      price = routeRate.from10to20 + t * (routeRate.from20to30 - routeRate.from10to20);
    } else if (kilos > 30 && kilos <= 40) {
      // Linear interpolation between from20to30 (at 30kg) and from30to40 (at 40kg)
      const t = (kilos - 30) / 10;
      price = routeRate.from20to30 + t * (routeRate.from30to40 - routeRate.from20to30);
    } else if (kilos > 40 && kilos <= 50) {
      // Linear interpolation between from30to40 (at 40kg) and from40to50 (at 50kg)
      const t = (kilos - 40) / 10;
      price = routeRate.from30to40 + t * (routeRate.from40to50 - routeRate.from30to40);
    } else if (kilos > 50 && kilos <= 60) {
      // Linear interpolation between from40to50 (at 50kg) and from50to60 (at 60kg)
      const t = (kilos - 50) / 10;
      price = routeRate.from40to50 + t * (routeRate.from50to60 - routeRate.from40to50);
    } else if (kilos > 60) {
      // For more than 60kg, add additional60 per kilo above 60kg
      price = routeRate.from50to60 + (kilos - 60) * routeRate.additional60;
    }
    if (pickupLines > 0 && routeRate.pickup_point) {
      price += pickupLines * routeRate.pickup_point;
    }
  }
  
  return price;
};

// The route price of an order: its kilos and its consumption-point lines, as
// the server prices it (projectes-v5 route-price.js fillMissingPrice). The order
// form, the quick edit and the CSV import all go through it: the last two
// priced without the lines (issues/227).
const orderRoutePrice = (routeRate, order) =>
  calculateRoutePrice(routeRate, order.kilograms, Array.isArray(order.lines) ? order.lines.length : 0);

export { assignRouteRate, assignRouteDate, checkIfDateIsValidInroute, calculateRoutePrice, orderRoutePrice, pickupIsFarm };
