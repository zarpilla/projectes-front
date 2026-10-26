// Tresoreria's validation of a line (issues/347): a line grouping several
// payrolls carries all their keys («payrolls:12», «payrolls:12:ss»). They are
// all set to the same state, even if some were validated already; the
// endpoint toggles unless it gets `validated`.

import service from "@/service/index";

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
