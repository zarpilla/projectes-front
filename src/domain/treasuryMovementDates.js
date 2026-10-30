// Tresoreria › Moviments bancaris: changing the date of pending movements
// (issues/370). The forecast marks each movement whose date can change with
// `date_edit` (the kind: an expected project line or an unpaid document) and
// `date_edit_id`; paid or collected ones have no `date_edit`. The server
// moves the document's «Previsió cobrament» / «Venciment» and the «Previsió
// pag.» of the project lines it is assigned to.

import service from "@/service/index";

export function dateEditKey(row) {
  return row && row.date_edit && row.date_edit_id ? `${row.date_edit}:${row.date_edit_id}` : null;
}

// «20261231» → «2026-12-31»; "" for an undated movement («Invalid date»)
export function isoOfDatef(datef) {
  const s = String(datef || "");
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : "";
}

// what to send: one change per movement whose new date differs from its own
export function movementDateChanges(edits, rows) {
  const current = new Map();
  for (const r of rows || []) {
    const key = dateEditKey(r);
    if (key && !current.has(key)) current.set(key, isoOfDatef(r.datef));
  }
  return Object.entries(edits || {})
    .filter(([key, date]) => date && current.has(key) && current.get(key) !== date)
    .map(([key, date]) => {
      const i = key.lastIndexOf(":");
      return { kind: key.slice(0, i), id: Number(key.slice(i + 1)), date };
    });
}

export async function saveMovementDates(changes) {
  const { data } = await service({ requiresAuth: true }).post("treasuries/movement-dates", { changes });
  return data;
}
