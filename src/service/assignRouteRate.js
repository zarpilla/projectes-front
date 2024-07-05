import dayjs from "dayjs";

const assignRouteRate = (form, routeRates, orders) => {
  // console.log("assignRouteRate!");
  // console.log("form", form);
  // console.log("routeRates", routeRates);
  // console.log("orders", orders);

  const pickup = form.pickup && form.pickup.id ? form.pickup.id : form.pickup;
  const route = form.route && form.route.id ? form.route.id : form.route;
  const delivery_type = form.delivery_type && form.delivery_type.id ? form.delivery_type.id : form.delivery_type;
  const owner = form.owner && form.owner.id ? form.owner.id : form.owner;

  if (form.route_rate === null || form.status !== "invoiced") {
    let rates = routeRates.filter(
      r => (r.route && r.route.id === route) || r.route === null
    );

    //console.log("pickup", pickup);

    if (pickup === 2) {
      // finca      

      const pendingOrders = orders.filter(
        o => o.pickup.id === pickup && o.status === "pending" && o.id !== form.id
        && o.route.id === route
        && o.owner.id === owner
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
          r =>
            (r.pickup && pickup && r.pickup.id === 1) || r.pickup === null
        );
      } else {
        // No pending orders for this route and owner
        // Add your logic here
        console.log("No pending orders for this route and owner");

        rates = rates.filter(
          r =>
            (r.pickup && pickup && r.pickup.id === pickup) ||
            r.pickup === null
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
      rates = rates.filter(r => r.route !== null);
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

const assignRouteDate = (route) => {
  let nextDay = dayjs().add(0, "day");  
  let warning = "";
  const todayDayOfWeek = dayjs().day();
  const routeDayOfWeek = route.monday ? 1 : route.tuesday ? 2 : route.wednesday ? 3 : route.thursday ? 4 : route.friday ? 5 : route.saturday ? 6 : route.sunday ? 7 : 0;

  if (todayDayOfWeek === routeDayOfWeek) {
    warning = "Ruta tancada per avui. Se t'assignarà la mateixa ruta però de la setmana vinent ja. Recorda portar el paquet.";
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
      nextDay = dayjs().add(1, "week").startOf("week").add(1, "day");
      warning = "Ruta tancada per demà. Se t'assignarà la mateixa ruta però de la setmana vinent ja. Recorda portar el paquet.";
    }
  }  
  
  return { nextDay, warning };
}

const checkIfDateIsValidInroute = (route, date) => {
  const routeDayOfWeek = route.monday ? 1 : route.tuesday ? 2 : route.wednesday ? 3 : route.thursday ? 4 : route.friday ? 5 : route.saturday ? 6 : route.sunday ? 7 : 0;
  if (routeDayOfWeek === date.day()) {
    return true;
  }
  return false;
}

export { assignRouteRate, assignRouteDate, checkIfDateIsValidInroute };
