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
