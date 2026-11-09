// issues/371: projects billed by the hour («Per hores»).
//
// The income lines that carry estimated hours are priced as hours × the
// project's price/hour: quantity = hours, amount = price/hour, so the totals
// and every report keep summing quantity × amount. Lines without estimated
// hours (materials, a fixed fee) keep what the user typed. The backend applies
// the same rule on save (projectes-v5 src/services/hours-billing.js); the front
// does it too so the form shows the right figures before saving.
//
// issues/421: a planning row (estimated hours) can carry its own price/hour
// (`price`); empty means the project's. The line then stores the weighted
// price: amount = Σ hours × row price / Σ hours, at 4 decimals.

export const BILLING_MODES = [
  { value: "project", label: "Per projecte" },
  { value: "hours", label: "Per hores" }
];

// projects saved before issues/371 have no mode: «Per projecte»
export const billingModeOf = (project) => (project && project.billing_mode === "hours" ? "hours" : "project");

export const defaultBillingMode = (me) =>
  me && me.options && me.options.default_billing_mode === "hours" ? "hours" : "project";

const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;
const round4 = (v) => Math.round((v + Number.EPSILON) * 10000) / 10000;

const parseDay = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

// Monday to Friday between from and to, both included
export function weekdaysBetween(from, to) {
  if (!from || !to) return 0;
  const start = parseDay(from);
  const end = parseDay(to);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  let n = 0;
  for (let t = start; t <= end; t += 86400000) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) n += 1;
  }
  return n;
}

// a «Total» row is its quantity; a weekly / monthly one is spread over the
// weekdays of its range as the forecast does (quantity / 5 a day, / 4.3 more
// for a month)
export function hoursOfRow(row) {
  const q = Number(row && row.quantity) || 0;
  if (!row || !q) return 0;
  if (row.quantity_type === "week") return (q / 5) * weekdaysBetween(row.from, row.to);
  if (row.quantity_type === "month") return (q / 5 / 4.3) * weekdaysBetween(row.from, row.to);
  return q;
}

// an empty row price follows the project's; a typed one (0 too) wins
export const hasOwnPrice = (row) => {
  const v = row ? row.price : null;
  return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
};
export const rowPrice = (row, pricePerHour) => (hasOwnPrice(row) ? Number(row.price) : Number(pricePerHour) || 0);

// what a row bills: its hours × its price/hour
export const rowAmount = (row, pricePerHour) => round2(hoursOfRow(row) * rowPrice(row, pricePerHour));

export const hoursOfLine = (line) => round4(((line && line.estimated_hours) || []).reduce((s, row) => s + hoursOfRow(row), 0));

// an invoiced or collected line keeps its amount: it is what the executed
// incomes count (paid, or linked to an invoice or an income)
const linkedId = (v) => (v && typeof v === "object" ? v.id : v);
export const isInvoiced = (line) => !!(line && (line.paid || linkedId(line.invoice) || linkedId(line.income)));

const isHoursLine = (line) => !!(line && Array.isArray(line.estimated_hours) && line.estimated_hours.length);

// the income lines priced by hours, with their phase
export function hoursLines(phases) {
  const out = [];
  for (const phase of phases || []) {
    for (const line of (phase && phase.incomes) || []) {
      if (isHoursLine(line)) out.push({ phase, line });
    }
  }
  return out;
}

// what the light editor does not show: income lines without hours and expenses
export function otherLinesCount(phases) {
  let n = 0;
  for (const phase of phases || []) {
    n += ((phase && phase.incomes) || []).filter((l) => !isHoursLine(l)).length;
    n += ((phase && phase.expenses) || []).length;
  }
  return n;
}

/**
 * Sets quantity / amount / total_amount of the hour lines to hours × price,
 * marking the changed ones dirty. In place; returns whether anything changed.
 */
export function priceHoursLines(phases, pricePerHour) {
  let changed = false;
  for (const { line } of hoursLines(phases)) {
    if (isInvoiced(line)) continue;
    const quantity = hoursOfLine(line);
    const billed = line.estimated_hours.reduce((sum, row) => sum + hoursOfRow(row) * rowPrice(row, pricePerHour), 0);
    const amount = round4(quantity ? billed / quantity : Number(pricePerHour) || 0);
    const total = round2(quantity * amount);
    if (Number(line.quantity) !== quantity || Number(line.amount) !== amount || Number(line.total_amount) !== total) {
      line.quantity = quantity;
      line.amount = amount;
      line.total_amount = total;
      line.dirty = true;
      changed = true;
    }
  }
  return changed;
}

/**
 * The line new hours go to: the first income line with hours, else one named
 * «Hores» or a new one, in the first phase (a new «Pressupost» phase when the
 * project has none). In place.
 */
export function ensureHoursLine(phases, pricePerHour) {
  const existing = hoursLines(phases)[0];
  if (existing) return existing.line;
  if (!phases.length) phases.push({ name: "Pressupost", incomes: [], expenses: [], dirty: true });
  const phase = phases[0];
  if (!phase.incomes) phase.incomes = [];
  let line = phase.incomes.find((l) => l && String(l.concept || "").trim().toLowerCase() === "hores");
  if (!line) {
    line = { concept: "Hores", quantity: 0, amount: Number(pricePerHour) || 0, total_amount: 0, estimated_hours: [], dirty: true };
    phase.incomes.push(line);
  }
  if (!line.estimated_hours) line.estimated_hours = [];
  return line;
}

// what the hour lines add up to: hours × price, or the invoiced amount
export const hoursLinesTotal = (phases) =>
  round2(hoursLines(phases).reduce((s, { line }) => s + (Number(line.quantity) || 0) * (Number(line.amount) || 0), 0));

export const invoicedHoursLinesCount = (phases) => hoursLines(phases).filter(({ line }) => isInvoiced(line)).length;

/**
 * «Preu/hora facturat previst» (issues/421): Σ hours × row price / Σ hours over
 * every planning row of the hour lines; the project price when there are no
 * hours yet.
 */
export function plannedPricePerHour(phases, pricePerHour) {
  let hours = 0;
  let billed = 0;
  for (const { line } of hoursLines(phases)) {
    for (const row of line.estimated_hours) {
      const h = hoursOfRow(row);
      hours += h;
      billed += h * rowPrice(row, pricePerHour);
    }
  }
  return hours ? round2(billed / hours) : round2(Number(pricePerHour) || 0);
}

/**
 * Hours worked × price/hour minus what the project has already invoiced, never
 * below 0. `billed` (issues/421, the API's total_real_hours_billed) is the
 * hours worked already priced at each planning line's price; without it, the
 * project's price/hour.
 */
export function pendingToInvoice(realHours, pricePerHour, invoiced, billed = null) {
  const worth = billed !== null && billed !== undefined && Number.isFinite(Number(billed))
    ? Number(billed)
    : (Number(realHours) || 0) * (Number(pricePerHour) || 0);
  return Math.max(0, round2(worth - (Number(invoiced) || 0)));
}
