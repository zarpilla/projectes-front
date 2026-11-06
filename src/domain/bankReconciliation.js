// «Tresoreria › Conciliació» (issues/413): the movements of the bank
// statements (Norma 43 files uploaded by hand) and the Tresoreria lines they
// are. The backend proposes and checks (bank-movements/*); this file holds
// what the screen works out on its own and the calls it makes.

import service from "@/service/index";

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

export const STATUS_FILTERS = [
  { id: "pending", label: "Pendents" },
  { id: "matched", label: "Conciliats" },
  { id: "ignored", label: "Ignorats" },
  { id: "all", label: "Tots" }
];

export const RULE_ACTIONS = [
  { id: "annotation", label: "Operació de tresoreria" },
  { id: "expense", label: "Despesa pagada" },
  { id: "ignore", label: "Ignorar" }
];

export const RULE_DIRECTIONS = [
  { id: "any", label: "Entrades i sortides" },
  { id: "in", label: "Només entrades" },
  { id: "out", label: "Només sortides" }
];

export function suggestionLabel(s) {
  if (!s) return "";
  if (s.kind === "partial") return "Cobrament o pagament parcial";
  if (s.kind === "lines") return `${s.lines.length} línies que sumen l'import`;
  return s.auto ? "Coincidència clara" : "Possible coincidència";
}

export function matchLabel(m) {
  if (m.status === "ignored") return m.rule ? `Ignorat (regla «${m.rule}»)` : "Ignorat";
  if (m.status !== "matched") return "Pendent";
  const how = { lines: "Línies de Tresoreria", annotation: "Operació de tresoreria", expense: "Despesa", transfer: "Traspàs entre comptes" }[m.match_kind] || "Conciliat";
  return m.rule ? `${how} (regla «${m.rule}»)` : how;
}

/**
 * The lines picked by hand: { [lineId]: { line, amount } }, `amount` only
 * for part of a pending document. What they add up to and what is missing.
 */
export function selectionTotals(movement, picked) {
  const list = Object.values(picked || {});
  const sum = round2(list.reduce((s, p) => s + (p.amount !== null && p.amount !== undefined && p.amount !== "" ? Number(p.amount) : p.line.amount), 0));
  const amount = round2(movement ? movement.amount : 0);
  return { count: list.length, sum, missing: round2(amount - sum), ok: list.length > 0 && Math.abs(amount - sum) < 0.005 };
}

// what POST bank-movements/:id/accept takes
export function acceptPayload(picked) {
  return Object.values(picked || {}).map((p) => {
    const part = p.amount !== null && p.amount !== undefined && p.amount !== "" ? round2(p.amount) : null;
    return part !== null && Math.abs(part - p.line.amount) >= 0.005 ? { id: p.line.id, amount: part } : { id: p.line.id };
  });
}

// a pending document can be collected or paid in part: the movement's amount
// when it is smaller than the line's
export function partialAmount(movement, line) {
  if (!line.pending || Math.sign(line.amount) !== Math.sign(movement.amount)) return null;
  return Math.abs(movement.amount) < Math.abs(line.amount) ? round2(movement.amount) : null;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * What the «Extracte pujat» dialog says, one paragraph per item, from the
 * answer of POST bank-movements/import; `money` and `date` format the values.
 */
export function importSummary(r, { money, date }) {
  const created = r.accounts.reduce((s, a) => s + a.created, 0);
  const duplicate = r.accounts.reduce((s, a) => s + a.duplicate, 0);
  const auto = r.auto.matched + r.auto.transfers + r.auto.ruled;
  return [
    `${plural(created, "moviment nou", "moviments nous")}${duplicate ? ` (${plural(duplicate, "ja s'havia pujat", "ja s'havien pujat")})` : ""}.`,
    `${auto} ${auto === 1 ? "conciliat" : "conciliats"} automàticament: ${r.auto.matched} amb línies de Tresoreria, ` +
      `${plural(r.auto.transfers, "traspàs", "traspassos")} i ${r.auto.ruled} per regles.`,
    ...r.accounts.map((a) => `${a.bank_account}: saldo de ${money(a.closing)} a ${date(a.to)}.`)
  ];
}

/** The file as base64, for POST bank-movements/import. */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const api = () => service({ requiresAuth: true });

export const reconciliationApi = {
  load: (params) =>
    api()
      .get("bank-movements/reconciliation", { params })
      .then((r) => r.data),
  importFile: (file_name, content) => api().post("bank-movements/import", { file_name, content }).then((r) => r.data),
  auto: () => api().post("bank-movements/auto").then((r) => r.data),
  candidates: (id, q) =>
    api()
      .get(`bank-movements/${id}/candidates`, { params: { q } })
      .then((r) => r.data),
  accept: (id, lines) => api().post(`bank-movements/${id}/accept`, { lines }).then((r) => r.data),
  create: (id, body) => api().post(`bank-movements/${id}/create`, body).then((r) => r.data),
  transfer: (id, other) => api().post(`bank-movements/${id}/transfer`, { with: other }).then((r) => r.data),
  ignore: (id) => api().post(`bank-movements/${id}/ignore`).then((r) => r.data),
  undo: (id) => api().post(`bank-movements/${id}/undo`).then((r) => r.data),
  imports: () => api().get("bank-imports?_sort=createdAt:DESC&_limit=20&populate=bank_account").then((r) => r.data),
  rules: () => api().get("bank-rules?_limit=-1&populate=*").then((r) => r.data),
  saveRule: (rule) => (rule.id ? api().put(`bank-rules/${rule.id}`, rule) : api().post("bank-rules", rule)),
  deleteRule: (id) => api().delete(`bank-rules/${id}`)
};

export function errorMessage(error, fallback) {
  return (error && error.response && error.response.data && error.response.data.error && error.response.data.error.message) || fallback;
}
