// Tresoreria › Moviments bancaris (issues/422, issues/456): ticking or
// unticking the check of «Accions» no longer saves on each click. Each change
// is kept on the page (light green when ticked, light red when a validated line
// is unticked), keyed by the line's check, and «Valida accions» sends them all,
// one after the other, with the endpoints a single click used:
//   - a pending document ticked: marked collected or paid on its date
//     (treasury-validations/settle, issues/415);
//   - a line grouping several payrolls: all its keys (issues/347);
//   - any other line: validated or not, with the state sent explicitly (never
//     a plain toggle, so sending it twice does no harm).
// Ticking a line back to how it loaded drops its change.

import service from "@/service/index";
import { parseValidationKey, setValidationKeys, settleRow, settleDate, validationAction } from "@/domain/treasuryValidation.js";

export function checkKey(row) {
  if (!row) return null;
  if (row.validation_keys && row.validation_keys.length > 1) return row.validation_keys.join("|");
  if (row.validation_key) return row.validation_key;
  if (row.settle) return `settle:${row.settle.kind}:${row.settle.id}`;
  return null;
}

// how the check shows: the pending change, or the line as it loaded
export function checkShown(pending, row) {
  const p = pending && pending[checkKey(row)];
  return p ? p.checked : Boolean(row && row.is_validated);
}

export function isPending(pending, row) {
  return Boolean(pending && pending[checkKey(row)]);
}

// ticking a pending document dated in the future needs the day it was paid
export function needsSettleDate(pending, row, today) {
  if (isPending(pending, row) || validationAction(row) !== "settle") return false;
  return !settleDate(row, today);
}

/**
 * The pending changes after clicking a line's check (a new object).
 * @param {object} pending key → change
 * @param {object} row the Tresoreria line
 * @param {string} today YYYY-MM-DD
 * @param {string} [date] the day a future line was paid (needsSettleDate)
 */
export function tickCheck(pending, row, today, date) {
  const key = checkKey(row);
  const next = { ...(pending || {}) };
  if (!key) return next;
  const checked = !checkShown(pending, row);
  if (checked === Boolean(row.is_validated)) {
    delete next[key];
    return next;
  }
  const change = {
    key,
    checked,
    concept: row.concept || row.type || "",
    amount: Number(row.total_amount) || 0
  };
  if (checked && validationAction(row) === "settle") {
    change.op = "settle";
    change.settle = row.settle;
    change.date = settleDate(row, today) || date || null;
  } else if (row.validation_keys && row.validation_keys.length > 1) {
    change.op = "keys";
    change.keys = row.validation_keys;
  } else {
    change.op = "set";
    change.validation_key = row.validation_key;
  }
  next[key] = change;
  return next;
}

// after a reload: a change the lines already show is done
export function prunePending(pending, rows) {
  const next = { ...(pending || {}) };
  for (const row of rows || []) {
    const key = checkKey(row);
    if (key && next[key] && next[key].checked === Boolean(row.is_validated)) delete next[key];
  }
  return next;
}

// «validat» / «validació treta»: what the change did (issues/456: a pending
// document ticked is «validat» too, it is also marked collected or paid)
export function changeLabel(change) {
  return change.checked ? "validat" : "validació treta";
}

// the notification after each one is sent (issues/456): «F-10 validat · 2 de 5»
export function changeMessage(change, n, total, error) {
  const name = change.concept || "Moviment";
  const progress = total > 1 ? ` · ${n} de ${total}` : "";
  return error ? `${name}: ${error}${progress}` : `${name} ${changeLabel(change)}${progress}`;
}

// Two filters of Moviments bancaris (issues/456), independent of each other:
//   - document: «Assignats» (a document behind it) / «Esperats» (planned, no
//     document yet: «Despesa esperada», «Ingrés esperat»…);
//   - validation: «Validats» / «No validats», by the check of «Accions».
// Within a group, the chosen buttons add up (none or both: no filter); the two
// groups narrow each other. Validated or not goes by the line as it loaded, so
// a line ticked while «No validats» is on stays until «Valida accions».
export const DOCUMENT_FILTERS = [
  { id: "assigned", label: "Assignats" },
  { id: "expected", label: "Esperats" }
];
export const VALIDATION_FILTERS = [
  { id: "validated", label: "Validats" },
  { id: "unvalidated", label: "No validats" }
];

const groupMatch = (chosen, group, test) => {
  const on = group.filter(f => chosen.includes(f.id));
  return !on.length || on.some(f => test(f.id));
};

/**
 * @param {object} row the Tresoreria line
 * @param {string[]} chosen ids of DOCUMENT_FILTERS and VALIDATION_FILTERS
 * @param {(row: object) => boolean} isExpected planned, no document yet
 * @param {(row: object) => boolean} hasCheck whether «Accions» has a check for it
 */
export function validationFilterMatch(row, chosen, isExpected, hasCheck) {
  if (!chosen || !chosen.length) return true;
  const expected = isExpected(row);
  return groupMatch(chosen, DOCUMENT_FILTERS, id => (id === "expected" ? expected : !expected)) &&
    groupMatch(chosen, VALIDATION_FILTERS, id => hasCheck(row) && (id === "validated") === Boolean(row.is_validated));
}

async function sendChange(change) {
  if (change.op === "settle") {
    if (!change.date) throw new Error("Falta la data de cobrament o pagament");
    return settleRow({ settle: change.settle }, change.date);
  }
  if (change.op === "keys") {
    const validated = await setValidationKeys(change.keys, change.checked);
    if (validated !== change.checked) throw new Error("No s'han pogut canviar totes les nòmines de la línia");
    return { validated };
  }
  const { data } = await service({ requiresAuth: true }).post("treasury-validations/toggle", {
    ...parseValidationKey(change.validation_key),
    validated: change.checked
  });
  return data;
}

const errorMessage = (error) =>
  (error && error.response && error.response.data && error.response.data.error && error.response.data.error.message) ||
  (error && error.message) ||
  "Error en validar el moviment";

/**
 * Sends the changes one after the other; one failing doesn't stop the rest.
 * @param {object[]} changes
 * @param {(n: number, change: object, error?: string) => void} [onProgress] after each one, n from 1
 * @returns {Promise<{ done: string[], failed: { key: string, concept: string, message: string }[] }>}
 */
export async function runPendingChecks(changes, onProgress) {
  const done = [];
  const failed = [];
  let n = 0;
  for (const change of changes) {
    n++;
    try {
      await sendChange(change);
      done.push(change.key);
      if (onProgress) onProgress(n, change);
    } catch (error) {
      const message = errorMessage(error);
      failed.push({ key: change.key, concept: change.concept, message });
      if (onProgress) onProgress(n, change, message);
    }
  }
  return { done, failed };
}
