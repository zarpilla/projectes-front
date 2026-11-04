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
  { label: "Rectificació de deduccions (factures rebudes negatives)", base: "40", vat: "41" },
  { label: "Compensacions del règim especial agrari", vat: "42" },
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

// the year's model 390, in its own numbering (backend vat-models.js boxes390).
// `rows`: the 303's boxes behind it, to show their documents
export const MODEL_390 = [
  {
    title: "IVA meritat",
    lines: [
      { label: "Règim ordinari 4 %", base: "01", vat: "02" },
      { label: "Règim ordinari 10 %", base: "03", vat: "04" },
      { label: "Règim ordinari 21 %", base: "05", vat: "06" },
      { label: "Adquisicions intracomunitàries de béns", base: "25", vat: "26", others: [["21", "22"], ["23", "24"]] },
      { label: "Adquisicions intracomunitàries de serveis", base: "551", vat: "552", others: [["545", "546"], ["547", "548"]] },
      { label: "Inversió del subjecte passiu", base: "27", vat: "28" },
      { label: "Modificació de bases i quotes", base: "29", vat: "30" },
      { label: "Total bases i quotes", base: "33", vat: "34", total: true }
    ]
  },
  {
    title: "IVA deduïble",
    lines: [
      { label: "Operacions interiors corrents", base: "48", vat: "49" },
      { label: "Operacions interiors amb béns d'inversió", base: "50", vat: "51" },
      { label: "Adquisicions intracomunitàries de béns corrents", base: "56", vat: "57" },
      { label: "Adquisicions intracomunitàries de béns d'inversió", base: "58", vat: "59" },
      { label: "Adquisicions intracomunitàries de serveis", base: "597", vat: "598" },
      { label: "Compensacions del règim especial agrari", base: "60", vat: "61" },
      { label: "Rectificació de deduccions", base: "639", vat: "62" },
      { label: "Regularització per la prorrata definitiva", vat: "522" },
      { label: "Suma de deduccions", vat: "64", total: true }
    ]
  },
  {
    title: "Resultat",
    lines: [
      { label: "Resultat règim general", vat: "65" },
      { label: "Suma de resultats", vat: "84" },
      { label: "Compensació de quotes de l'exercici anterior", vat: "85" },
      { label: "Resultat de la liquidació", vat: "86", total: true },
      { label: "Total a ingressar de les autoliquidacions de l'any", vat: "95" },
      { label: "Últim període: a compensar", vat: "97" },
      { label: "Últim període: a retornar", vat: "98" }
    ]
  },
  {
    title: "Volum d'operacions",
    lines: [
      { label: "Operacions en règim general", vat: "99", from: "80" },
      { label: "Lliuraments intracomunitaris exempts", vat: "103", from: "93" },
      { label: "Exportacions i altres exemptes amb dret a deducció", vat: "104", from: "94" },
      { label: "Exemptes sense dret a deducció", vat: "105", from: "83" },
      { label: "No subjectes per regles de localització", vat: "110", from: "84" },
      { label: "Subjectes amb inversió del subjecte passiu", vat: "125", from: "125" },
      { label: "Total volum d'operacions", vat: "108", total: true }
    ]
  },
  {
    title: "Operacions específiques i prorrata",
    lines: [
      { label: "Adquisicions interiors exemptes", vat: "230" },
      { label: "Prorrata: import total d'operacions", vat: "115" },
      { label: "Prorrata: operacions amb dret a deduir", vat: "116" },
      { label: "Prorrata: %", vat: "118", pct: true }
    ]
  }
];

// I, U, C, D and N of the 303's «Tipus de declaració»
export const DECLARATION_TYPES = {
  I: "Ingrés",
  U: "Domiciliació de l'ingrés",
  C: "A compensar",
  D: "Devolució",
  N: "Sense activitat o resultat zero"
};

/** The types a quarter can be filed with, from its result (D only in the 4T). */
export function declarationTypesFor(result, quarter) {
  if (result > 0) return ["I", "U"];
  if (result < 0) return quarter === 4 ? ["C", "D"] : ["C"];
  return ["N"];
}

export const CHANGE_LABELS = { added: "Afegit", removed: "Tret", changed: "Canviat" };

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
  intracom: "Adquisició intracomunitària de serveis (autoliquidar)",
  intracom_goods: "Adquisició intracomunitària de béns (autoliquidar)",
  isp: "Inversió del subjecte passiu (autoliquidar)",
  none: "Res a autoliquidar"
};

// received lines with VAT
export const VAT_SPECIAL_LABELS = {
  none: "IVA espanyol deduïble",
  reagp: "Compensació agrària (REAGP)",
  foreign_vat: "IVA estranger, no deduïble"
};

const LABELS_BY_FIELD = { vat_operation: OPERATION_LABELS, reverse_charge: REVERSE_CHARGE_LABELS, vat_special: VAT_SPECIAL_LABELS };

export function classificationLabel(field, value) {
  if (!value) return "";
  return (LABELS_BY_FIELD[field] || {})[value] || value;
}

export const ISSUE_LABELS = {
  "received-reagp": "Rebudes al 12 % o 10,5 % (possible compensació agrària)",
  "received-foreign-vat": "Rebudes de fora amb IVA (possiblement no deduïble)",
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
    base: round2(rows.reduce((s, r) => s + (r.base_box ? r.base || 0 : 0), 0)),
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
    // a received invoice has two: reverse_charge (the default) and vat_special
    if (field === "vat_special") item.field = field;
    if (field === "reverse_charge" && (v === "intracom" || v === "isp") && rate !== null && rate !== "") item.rate = Number(rate);
    items.push(item);
  }
  return items;
}
