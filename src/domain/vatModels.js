// IVA › Models 303 i 390 (Beta), from GET treasuries/vat-models?year=.
// The backend gives each quarter's boxes, their sum for the year and one row
// per document and VAT rate with the boxes it goes to; this lays the boxes out
// as the AEAT form does and filters the rows for the detail.

// [label, base box, rate box, quota box]; `missing` = not computed yet
export const ACCRUED = [
  { label: "Règim general 0 %", base: "150", rate: "151", vat: "152" },
  { label: "Règim general 4 %", base: "01", rate: "02", vat: "03" },
  { label: "Règim general 10 %", base: "04", rate: "05", vat: "06" },
  { label: "Règim general 21 %", base: "07", rate: "08", vat: "09" },
  { label: "Adquisicions intracomunitàries (autoliquidació)", base: "10", vat: "11" },
  { label: "Altres amb inversió del subjecte passiu", base: "12", vat: "13" },
  { label: "Modificació de bases i quotes (rectificatives)", base: "14", vat: "15" }
];

export const DEDUCTIBLE = [
  { label: "Operacions interiors corrents", base: "28", vat: "29" },
  { label: "Operacions interiors amb béns d'inversió", base: "30", vat: "31" },
  { label: "Importacions corrents", base: "32", vat: "33", missing: true },
  { label: "Adquisicions intracomunitàries corrents", base: "36", vat: "37" },
  { label: "Adquisicions intracomunitàries de béns d'inversió", base: "38", vat: "39" },
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

// information boxes of the 303 (bases of operations without VAT charged)
export const INFORMATION = [
  { label: "Lliuraments i prestacions intracomunitàries exempts", box: "59" },
  { label: "Exportacions i operacions assimilades", box: "60" },
  { label: "No subjectes per regles de localització", box: "120" },
  { label: "Subjectes amb inversió del subjecte passiu", box: "122" }
];

// the year's volume of operations (390)
export const VOLUME = [
  { label: "Operacions en règim general", box: "80" },
  { label: "Exemptes sense dret a deducció", box: "83" },
  { label: "No subjectes per regles de localització", box: "84" },
  { label: "Lliuraments intracomunitaris exempts", box: "93" },
  { label: "Exportacions i altres exemptes amb dret a deducció", box: "94" },
  { label: "Subjectes amb inversió del subjecte passiu", box: "125" },
  { label: "Total volum d'operacions", box: "88", total: true }
];

// issued 0 % lines: Verifactu's codes (backend services/vat-models.js OPERATIONS)
export const OPERATION_LABELS = {
  E1: "Exempta (art. 20: formació, serveis socials…)",
  E2: "Exportació (art. 21)",
  E5: "Lliurament intracomunitari (art. 25)",
  N1: "No subjecta (fora del 303)",
  N2: "No subjecta per localització (servei a fora)",
  S2: "Inversió del subjecte passiu"
};

// received 0 % invoices
export const REVERSE_CHARGE_LABELS = {
  intracom: "Adquisició intracomunitària (autoliquidar)",
  isp: "Inversió del subjecte passiu (autoliquidar)",
  none: "Res a autoliquidar"
};

export function classificationLabel(field, value) {
  if (!value) return "";
  return (field === "reverse_charge" ? REVERSE_CHARGE_LABELS : OPERATION_LABELS)[value] || value;
}

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
    (!box || r.base_box === box || r.vat_box === box || r.info_box === box || r.annual_box === box ||
      (r.accrued_boxes && r.accrued_boxes.includes(box))) &&
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

/**
 * The classification request for the checked rows: [{ kind, id, value, rate? }],
 * one per document (a document has one row at 0 %). `value` null takes each
 * row's proposal (rows without one are left out); "clear" unclassifies them.
 */
export function classifyItems(rows, field, value = null, rate = null) {
  const seen = new Set();
  const items = [];
  for (const r of rows || []) {
    if (!r.classify || r.classify.field !== field) continue;
    const key = `${r.kind}:${r.id}`;
    const v = value === "clear" ? null : value || r.proposal;
    if (seen.has(key) || (!v && value !== "clear")) continue;
    seen.add(key);
    const item = { kind: r.kind, id: r.id, value: v };
    if (field === "reverse_charge" && (v === "intracom" || v === "isp") && rate !== null && rate !== "") item.rate = Number(rate);
    items.push(item);
  }
  return items;
}
