import dayjs from "dayjs";

const assignRouteRate = (form, routeRates, orders) => {
  console.log("assignRouteRate!");
  console.log("form", form);
  console.log("routeRates", routeRates);
  console.log("orders", orders);

  const pickup = form.pickup && form.pickup.id ? form.pickup.id : form.pickup;
  const route = form.route && form.route.id ? form.route.id : form.route;
  const delivery_type = form.delivery_type && form.delivery_type.id ? form.delivery_type.id : form.delivery_type;
  const owner = form.owner && form.owner.id ? form.owner.id : form.owner;

  if (form.route_rate === null || form.status !== "invoiced") {
    let rates = routeRates.filter(
      r => (r.route && r.route.id === route) || r.route === null
    );

    console.log("pickup", pickup);

    if (pickup === 2) {
      // finca      

      const pendingOrders = orders.filter(
        o => o.pickup.id === pickup && o.status === "pending" && o.id !== form.id
        && o.route.id === route
        && o.owner.id === owner
      );
      console.log("pendingOrders", pendingOrders);
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

      console.warn("rates!!!", rates);

      form.route_rate = rates[0];
    } else {
      form.route_rate = rates[0];
    }
  }
  return form.route_rate;
};

const assignRouteDate = (route) => {
  let nextDay = dayjs().add(1, "day");

  if (route.monday) {
    // fins next monday after today
    nextDay = dayjs()
      .add(1, "week")
      .startOf("week")
      .add(1, "day");
  }
  else if (route.tuesday) {
    nextDay = dayjs()
      .add(1, "week")
      .startOf("week")
      .add(2, "day");
  } else if (route.wednesday) {
    nextDay = dayjs()
      .add(1, "week")
      .startOf("week")
      .add(3, "day");
  } else if (route.thursday) {
    nextDay = dayjs()
      .add(1, "week")
      .startOf("week")
      .add(4, "day");
  } else if (route.friday) {
    nextDay = dayjs()
      .add(1, "week")
      .startOf("week")
      .add(5, "day");
  } else if (route.saturday) {
    nextDay = dayjs()
      .add(1, "week")
      .startOf("week")
      .add(6, "day");
  } else if (route.sunday) {
    nextDay = dayjs()
      .add(1, "week")
      .startOf("week")
      .add(7, "day");
  }
  return nextDay
}

export { assignRouteRate, assignRouteDate };
