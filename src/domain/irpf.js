// IRPF page (issues/348): the withholdings paid to Hisenda (model 111), from
// GET treasuries/irpf?year=. The backend gives the rows and the quarters; this
// labels and filters them for the screen. Settling: issues/419, src/domain/taxSettle.js.

export const KIND_LABELS = {
  payrolls: "Nòmina",
  "received-invoices": "Factura rebuda",
  "received-expenses": "Despesa rebuda"
};

export const KIND_FILTERS = [
  { id: null, label: "Tot" },
  { id: "payrolls", label: "Nòmines" },
  { id: "documents", label: "Factures i despeses" }
];

export function kindLabel(row) {
  const label = KIND_LABELS[row.kind] || row.kind;
  return row.document_type ? `${label} (${row.document_type})` : label;
}

// quarter 1–4 or quarters [1–4] (none: all, issues/418); kind "payrolls",
// "documents" (invoices and expenses) or null for all
export function filterIrpfRows(rows, { quarter = null, quarters = [], kind = null } = {}) {
  const wanted = quarter ? [quarter] : quarters || [];
  return (rows || []).filter(
    (r) =>
      (!wanted.length || wanted.includes(r.quarter)) &&
      (!kind || (kind === "payrolls" ? r.kind === "payrolls" : r.kind !== "payrolls"))
  );
}

export function irpfRowsTotals(rows) {
  const round2 = (v) => Math.round(v * 100) / 100;
  return {
    count: rows.length,
    base: round2(rows.reduce((s, r) => s + (r.base || 0), 0)),
    irpf: round2(rows.reduce((s, r) => s + (r.irpf || 0), 0))
  };
}
