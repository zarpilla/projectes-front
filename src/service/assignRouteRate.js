import dayjs from "dayjs";

const assignRouteRate = (form, routeRates, orders) => {
  // console.log("assignRouteRate!");
  // console.log("form", form);
  // console.log("routeRates", routeRates);
  // console.log("orders", orders);

  const pickup = form.pickup && form.pickup.id ? form.pickup.id : form.pickup;
  const route = form.route && form.route.id ? form.route.id : form.route;
  const delivery_type =
    form.delivery_type && form.delivery_type.id
      ? form.delivery_type.id
      : form.delivery_type;
  const owner = form.owner && form.owner.id ? form.owner.id : form.owner;

  if (form.route_rate === null || form.status !== "invoiced") {
    let rates = routeRates.filter(
      r =>
        (r.routes && r.routes.length && r.routes.find(rt => rt.id === route)) ||
        r.routes.length === 0
    );

    if (pickup === 2) {
      // finca

      const pendingOrders = orders.filter(
        o =>
          o.pickup.id === pickup &&
          (o.status === "pending" || o.status === "deposited") &&
          o.id !== form.id &&
          o.route.id === route &&
          o.owner.id === owner
      );
      //console.log("pendingOrders", pendingOrders);
      if (pendingOrders.length > 0) {
        // We have pending orders for this route and owner
        // Add your logic here
        console.log(
          "We have pending orders for this route and owner, applying NO PICKUP",
          pendingOrders
        );

        rates = rates.filter(
          r => (r.pickup && pickup && r.pickup.id === 1) || r.pickup === null
        );
      } else {
        // No pending orders for this route and owner
        // Add your logic here
        console.log("No pending orders for this route and owner");

        rates = rates.filter(
          r =>
            (r.pickup && pickup && r.pickup.id === pickup) || r.pickup === null
        );
      }
    } else {
      rates = rates.filter(
        r => (r.pickup && pickup && r.pickup.id === 1) || r.pickup === null
      );
    }

    rates = rates.filter(
      r =>
        (r.delivery_type && r.delivery_type.id === delivery_type) ||
        r.delivery_type === null
    );
    if (rates.length > 1) {
      rates = rates.filter(r => r.routes && r.routes.length > 0);
      if (rates.length === 0) {
        rates = rates.filter(r => r.routes && r.routes.length === 0);
      }
    }
    if (rates.length === 0) {
      // this.$buefy.snackbar.open({
      //   message: "Error. No s'ha trobat cap tarifa per aquesta ruta",
      //   queue: false
      // });
    } else if (rates.length > 1) {
      // this.$buefy.snackbar.open({
      //   message: "Error. S'ha trobat més d'una tarifa per aquesta ruta",
      //   queue: false
      // });

      //console.warn("rates!!!", rates);

      form.route_rate = rates[0];
    } else {
      form.route_rate = rates[0];
    }
  }
  return form.route_rate;
};

const assignRouteDate = route => {
  let nextDay = dayjs().add(0, "day");
  let warning = "";
  const todayDayOfWeek = dayjs().day();
  const routeDayOfWeek = route.monday
    ? 1
    : route.tuesday
    ? 2
    : route.wednesday
    ? 3
    : route.thursday
    ? 4
    : route.friday
    ? 5
    : route.saturday
    ? 6
    : route.sunday
    ? 7
    : 0;

  if (todayDayOfWeek === routeDayOfWeek) {
    warning =
      "Ruta tancada per avui. Se t'assignarà la mateixa ruta però de la setmana vinent ja. Recorda portar el paquet.";
  }
  let found = false;
  while (!found) {
    nextDay = nextDay.add(1, "day");
    if (routeDayOfWeek === nextDay.day()) {
      found = true;
    }
  }
  if (nextDay.isSame(dayjs().add(1, "day"), "day")) {
    if (dayjs().hour() >= 14) {
      nextDay = dayjs()
        .add(1, "week")
        .startOf("week")
        .add(1, "day");
      warning =
        "Ruta tancada per demà. Se t'assignarà la mateixa ruta però de la setmana vinent ja. Recorda portar el paquet.";
    }
  }

  return { nextDay, warning };
};

const checkIfDateIsValidInroute = (route, date, routeFestives) => {
  if (routeFestives.map(f => f.date).includes(date.format("YYYY-MM-DD"))) {
    return false;
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
    routeDayOfWeek.push(7);
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

export { assignRouteRate, assignRouteDate, checkIfDateIsValidInroute, calculateRoutePrice };
