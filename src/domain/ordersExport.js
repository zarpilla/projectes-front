// The exports of Comandes (issues/177).

// The columns of «Comandes (.ods)»: the ones of the import CSV, but as plain
// cells. The CSV quotes addresses and notes because they can hold commas; in a
// spreadsheet those quotes were part of the text, and an empty note came out as
// `""`. `pickup` is the pickup point's id, as the import reads it (it was a 1/0
// that said 0 for a warehouse), and its name goes next to it.
export function orderOdsFields (csvFields) {
  return {
    ...csvFields,
    contact_address: 'contact_address',
    pickup: 'pickup.id',
    pickup_name: 'pickup.name',
    notes: 'comments'
  }
}

// The column names of «Comandes (.ods)» and «Exporta selecció»: the names the
// Diligència uses on screen, not the field names (issues/349). Only the exports:
// the import and «Exemple CSV de comandes» keep the field names, which is what
// the CSV files people import carry.
export const ORDER_EXPORT_HEADERS = {
  id: 'ID comanda',
  date: 'Data comanda',
  owner_id: 'ID sòcia',
  owner_name: 'Sòcia',
  route_name: 'Ruta',
  estimated_delivery_date: "Data prevista d'entrega",
  contact_name: 'Raó social',
  contact_trade_name: 'Nom comercial',
  contact_address: 'Adreça',
  contact_postcode: 'Codi postal',
  contact_city: 'Població',
  contact_nif: 'NIF',
  contact_phone: 'Telèfon',
  contact_legal_form: 'Forma jurídica',
  contact_time_slot_1_ini: 'Horari 1 inici',
  contact_time_slot_1_end: 'Horari 1 fi',
  contact_time_slot_2_ini: 'Horari 2 inici',
  contact_time_slot_2_end: 'Horari 2 fi',
  units: 'Caixes',
  kilograms: 'Kg',
  refrigerated: 'Refrigerada',
  fragile: 'Fràgil',
  pickup: 'ID punt de recollida',
  pickup_name: 'Punt de recollida',
  provider_order_number: 'Referència',
  notes: 'Notes',
  preu_ruta: 'Preu ruta',
  descompte_volum: 'Descompte per volum',
  descompte_multientrega_percent: 'Descompte multientrega (%)',
  descompte_recollida_percent: 'Descompte recollida (%)',
  preu_final: 'Preu final'
}

// The fields of both order exports, keyed by their Catalan column name.
export function orderExportFields (csvFields, csvExportFields) {
  const fields = { id: 'id', date: 'route_date', ...orderOdsFields(csvFields), ...csvExportFields }
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [ORDER_EXPORT_HEADERS[key] || key, field])
  )
}

// The rows to export: the selected ones, else every order matching the filters,
// not only the loaded page. `fetchAll` asks the backend for them.
export async function exportRows ({ checked, rows, morePages, fetchAll }) {
  if (checked.length) return checked
  if (!morePages) return rows
  return fetchAll()
}
