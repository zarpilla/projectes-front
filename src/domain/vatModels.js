// Informes › Models 303 i 390 (Beta), from GET treasuries/vat-models?year=.
// The backend gives each quarter's boxes, their sum for the year and one row
// per document and VAT rate with the boxes it goes to; this lays the boxes out
// as the AEAT form does and filters the rows for the detail.

// [label, base box, rate box, quota box]; `missing` = not computed yet
export const ACCRUED = [
  { label: "Règim general 0 %", base: "150", rate: "151", vat: "152" },
  { label: "Règim general 4 %", base: "01", rate: "02", vat: "03" },
  { label: "Règim general 10 %", base: "04", rate: "05", vat: "06" },
  { label: "Règim general 21 %", base: "07", rate: "08", vat: "09" },
  { label: "Adquisicions intracomunitàries", base: "10", vat: "11", missing: true },
  { label: "Altres amb inversió del subjecte passiu", base: "12", vat: "13", missing: true },
  { label: "Modificació de bases i quotes (rectificatives)", base: "14", vat: "15" }
];

export const DEDUCTIBLE = [
  { label: "Operacions interiors corrents", base: "28", vat: "29" },
  { label: "Operacions interiors amb béns d'inversió", base: "30", vat: "31", missing: true },
  { label: "Importacions corrents", base: "32", vat: "33", missing: true },
  { label: "Adquisicions intracomunitàries corrents", base: "36", vat: "37", missing: true },
  { label: "Regularització per la prorrata definitiva", vat: "44", missing: true }
];

export const RESULT = [
  { label: "Resultat règim general (27 − 45)", box: "46" },
  { label: "Suma de resultats", box: "64" },
  { label: "% atribuïble a l'Estat", box: "65", pct: true },
  { label: "Atribuïble a l'Estat", box: "66" },
  { label: "Quotes a compensar de períodes anteriors", box: "110" },
  { label: "Quotes a compensar aplicades en aquest període", box: "78" },
  { label: "Quotes a compensar pendents per a períodes posteriors", box: "87" },
  { label: "Resultat", box: "69" },
  { label: "Resultat de la liquidació", box: "71", total: true }
];

export const ISSUE_LABELS = {
  "issued-zero": "Emeses al 0 % sense classificar",
  "unknown-rate": "Emeses a un tipus sense casella",
  "received-foreign-zero": "Rebudes de fora al 0 % (possible autoliquidació)"
};

export const AREA_LABELS = {
  ES: "Espanya",
  EU: "Unió Europea",
  NONEU: "Fora de la UE o país no reconegut"
};

export const KIND_LABELS = {
  "emitted-invoices": "Factura emesa",
  "received-incomes": "Ingrés",
  "received-invoices": "Factura rebuda"
};

/** The boxes of the period: a quarter (1–4) or the year (null). */
export function periodBoxes(data, quarter) {
  if (!data) return {};
  if (!quarter) return data.annual || {};
  const q = (data.quarters || []).find(x => x.quarter === quarter);
  return q ? q.boxes : {};
}

/**
 * The detail rows of the period, of one box (a row is in its base and quota
 * boxes) or of one issue code.
 */
export function filterVatRows(rows, { quarter = null, box = null, issue = null } = {}) {
  return (rows || []).filter(r =>
    (!quarter || r.quarter === quarter) &&
    (!box || r.base_box === box || r.vat_box === box) &&
    (!issue || r.issue === issue)
  );
}

/** The issues of the period (the backend gives them for the year). */
export function periodIssues(data, rows, quarter) {
  if (!data) return [];
  return (data.issues || [])
    .map(i => {
      const list = filterVatRows(rows, { quarter, issue: i.code });
      return {
        ...i,
        count: list.length,
        base: round2(list.reduce((s, r) => s + r.base, 0)),
        label: ISSUE_LABELS[i.code] || i.code,
        areas: Object.keys(AREA_LABELS)
          .map(area => ({ area, label: AREA_LABELS[area], count: list.filter(r => r.area === area).length }))
          .filter(a => a.count)
      };
    })
    .filter(i => i.count);
}

/** The amount a row adds to the return: received rows after the prorrata. */
export function rowVat(row) {
  return row.side === "received" ? row.deductible_vat : row.vat;
}

export function vatRowsTotals(rows) {
  return {
    count: rows.length,
    base: round2(rows.reduce((s, r) => s + (r.base || 0), 0)),
    vat: round2(rows.reduce((s, r) => s + (rowVat(r) || 0), 0))
  };
}

function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
