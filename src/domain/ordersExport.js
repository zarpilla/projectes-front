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

// The rows to export: the selected ones, else every order matching the filters,
// not only the loaded page. `fetchAll` asks the backend for them.
export async function exportRows ({ checked, rows, morePages, fetchAll }) {
  if (checked.length) return checked
  if (!morePages) return rows
  return fetchAll()
}
