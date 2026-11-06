// Tresoreria's validation of a line (issues/347): a line grouping several
// payrolls carries all their keys («payrolls:12», «payrolls:12:ss»). They are
// all set to the same state, even if some were validated already; the
// endpoint toggles unless it gets `validated`.

import service from "@/service/index";
import { isoOfDatef } from "@/domain/treasuryMovementDates.js";

export function parseValidationKey(key) {
  const [entity_type, id, sub_type] = String(key).split(":");
  return { entity_type, entity_id: parseInt(id), sub_type: sub_type || null };
}

// the state the line ends in: validated only if every key is
export async function setValidationKeys(keys, validated) {
  const answers = await Promise.all(
    keys.map((key) =>
      service({ requiresAuth: true }).post("treasury-validations/toggle", {
        ...parseValidationKey(key),
        validated
      })
    )
  );
  return answers.every((r) => r.data && r.data.validated);
}

// issues/415: a pending document line (`settle`: its kind and id) has the
// check too, and ticking it marks the document collected or paid on the
// line's date. Every other line validates as before.
export function canValidate(row) {
  return Boolean(row && (row.settle || ((row.paid || row.real) && row.validation_key)));
}

// "settle" (mark the document paid and validate it) or "toggle"
export function validationAction(row) {
  return row && row.settle && !row.is_validated ? "settle" : "toggle";
}

// the date a pending line is settled on: its own, or null when it is still
// to come (the screen asks for one: a payment can't be in the future)
export function settleDate(row, today) {
  const date = isoOfDatef(row && row.datef);
  return date && date <= today ? date : null;
}

export async function settleRow(row, date) {
  const answer = await service({ requiresAuth: true }).post("treasury-validations/settle", {
    entity_type: row.settle.kind,
    entity_id: row.settle.id,
    date
  });
  return answer.data;
}
