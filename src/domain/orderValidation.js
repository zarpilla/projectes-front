// Which fields block saving an order (OrdersForm). `true` means invalid.
//
//   form                    the order being edited
//   contacts                delivery points the user can choose from
//   collectionPoints        collection points offered for the chosen pickup
//   collectionPickupRoutes  routes that can collect from the chosen point
//   isPickupPoint           pickup-point orders carry lines instead of units/kg
export function orderErrors ({ form, contacts, collectionPoints, collectionPickupRoutes, isPickupPoint }) {
  const isContactValid =
    form.contact &&
    contacts.some(c => c.id === form.contact);
  const baseErrors = {
    owner: form.owner === null,
    route: form.route === null,
    contact: !form.contact || !isContactValid,
    delivery_date: form.delivery_date === null,
    delivery_type: form.delivery_type === null,
    pickup: !form.is_collection_order && form.pickup == null,
    contact_name:
      form.contact_name === null || form.contact_name === "",
    contact_nif:
      form.contact_nif === null || form.contact_nif === "",
    contact_legal_form: form.contact_legal_form === null,
    contact_address:
      form.contact_address === null ||
      form.contact_address === "",
    contact_postcode:
      form.contact_postcode === null ||
      form.contact_postcode === "",
    contact_city:
      form.contact_city === null || form.contact_city === "",
    contact_phone:
      form.contact_phone === null || form.contact_phone === ""
  };

  // a collection point is required when the chosen pickup offers some
  if (
    !form.is_collection_order &&
    collectionPoints &&
    collectionPoints.length > 0
  ) {
    baseErrors.collection_point = !form.collection_point;

    // and then a route to collect from it
    if (
      form.collection_point &&
      collectionPickupRoutes.length > 0
    ) {
      baseErrors.collection_pickup_route = !form.collection_pickup_route;
    }
  }

  if (isPickupPoint) {
    // pickup points: every line needs units, kilograms and a name
    baseErrors.lines =
      !form.lines ||
      form.lines.length === 0 ||
      form.lines.some(
        line =>
          !line.units ||
          line.units <= 0 ||
          !line.kilograms ||
          line.kilograms <= 0 ||
          !line.name ||
          line.name.trim() === ""
      );
  } else {
    // regular orders: units and kilograms on the order itself
    baseErrors.units = form.units === null || form.units <= 0;
    baseErrors.kilograms =
      form.kilograms === null ||
      form.kilograms === "" ||
      form.kilograms <= 0;
  }

  return baseErrors;
}

// The first reason not to save an order, checked by OrdersForm.submit before
// anything is sent (null when it can be saved). Conditions are kept as the form
// always had them, including two quirks pinned by tests/unit/orderSaveChecks.spec.js:
// slot 2's end-time check looks at slot 1's end, and the 3-hour minimum only
// applies when both slots are shorter.
export function orderSaveProblem (form, { collectionPoints, collectionPickupRoutes }) {
  if (form.units <= 0 || form.kilograms <= 0) {
    return "Error. Els valors de caixes i kilos han de ser positius";
  }
  if (
    form.contact_time_slot_1_ini > form.contact_time_slot_1_end
  ) {
    return "Error. L'hora d'inici del tram horari 1 no pot ser més gran que l'hora de finalització";
  }
  if (!form.contact_trade_name) {
    return "Error. No hi ha nom comercial al punt d'entrega";
  }
  if (!form.contact_city) {
    return "Error. No hi ha població al punt d'entrega";
  }
  if (!form.contact_nif) {
    return "Error. No hi ha NIF al punt d'entrega";
  }
  if (!form.contact_phone) {
    return "Error. No hi ha telèfon al punt d'entrega";
  }
  if (!form.contact_address) {
    return "Error. No hi ha adreça al punt d'entrega";
  }
  if (!form.contact_postcode) {
    return "Error. No hi ha codi postal al punt d'entrega";
  }
  if (
    !form.is_collection_order &&
    collectionPoints &&
    collectionPoints.length > 0 &&
    !form.collection_point
  ) {
    return "Error. Has de seleccionar un punt de recollida en finca";
  }
  if (
    !form.is_collection_order &&
    form.collection_point &&
    collectionPickupRoutes.length > 0 &&
    !form.collection_pickup_route
  ) {
    return "Error. Has de seleccionar una ruta de recollida";
  }
  if (
    !form.contact_time_slot_1_ini ||
    !form.contact_time_slot_1_end
  ) {
    return "Error. No hi ha tots els trams horaris definits al punt d'entrega";
  }
  if (
    form.contact_time_slot_2_ini &&
    form.contact_time_slot_2_ini > form.contact_time_slot_2_end
  ) {
    return "Error. L'hora d'inici del tram horari 2 no pot ser més gran que l'hora de finalització";
  }
  if (
    form.contact_time_slot_1_ini &&
    !form.contact_time_slot_1_end
  ) {
    return "Error. Cal indicar l'hora de finalització del tram horari 1";
  }
  if (
    form.contact_time_slot_2_ini &&
    form.contact_time_slot_2_ini &&
    !form.contact_time_slot_1_end
  ) {
    return "Error. Cal indicar l'hora de finalització del tram horari 2";
  }
  if (
    form.contact_time_slot_1_end -
      form.contact_time_slot_1_ini <
      3 &&
    form.contact_time_slot_2_end &&
    form.contact_time_slot_2_end -
      form.contact_time_slot_2_ini <
      3
  ) {
    return "Error. El tram horari ha de ser mínim de 3 hores";
  }
  return null;
}
