// Tresoreria › Conciliació (issues/455): «Accepta» no longer reconciles the
// movement at once (each one saved and reloaded the whole list, so going
// through an extract was slow). It is kept on the page, pending validation,
// and «Valida» sends them all one after the other with the same endpoint
// (bank-movements/:id/accept), a notification «[document] conciliat» after
// each one and one reload at the end.

/** The lines POST bank-movements/:id/accept takes for a suggestion. */
export function suggestionLines(movement, suggestion) {
  if (suggestion.kind === "partial") return [{ id: suggestion.lines[0].id, amount: movement.amount }];
  return suggestion.lines.map((l) => ({ id: l.id }));
}

// «F-10, F-11»: what the notification names
export function queuedLabel(suggestion) {
  const codes = (suggestion.lines || []).map((l) => l.code).filter(Boolean);
  return codes.length ? codes.join(", ") : "Moviment";
}

/**
 * The queue after accepting a suggestion (a new object), or `{ error }` when a
 * line is already taken by another movement waiting for «Valida».
 * @param {object} queue movement id → entry
 */
export function queueAccept(queue, movement, suggestion) {
  const lines = suggestionLines(movement, suggestion);
  const taken = new Set();
  for (const entry of Object.values(queue || {})) {
    if (entry.id === movement.id) continue;
    for (const l of entry.lines) taken.add(String(l.id));
  }
  const clash = (suggestion.lines || []).find((l) => taken.has(String(l.id)));
  if (clash) return { error: `${clash.code || "Aquesta línia"} ja és a un altre moviment pendent de validar` };
  return {
    queue: {
      ...(queue || {}),
      [movement.id]: { id: movement.id, lines, label: queuedLabel(suggestion), amount: movement.amount }
    }
  };
}

export function unqueue(queue, movementId) {
  const next = { ...(queue || {}) };
  delete next[movementId];
  return next;
}

// after a reload: a movement no longer pending (reconciled elsewhere, undone…) leaves the queue
export function pruneQueue(queue, movements, status) {
  if (status !== "pending") return { ...(queue || {}) };
  const pending = new Set((movements || []).filter((m) => m.status === "pending").map((m) => m.id));
  const next = {};
  for (const [id, entry] of Object.entries(queue || {})) if (pending.has(entry.id)) next[id] = entry;
  return next;
}

const errorMessage = (error) =>
  (error && error.response && error.response.data && error.response.data.error && error.response.data.error.message) ||
  (error && error.message) ||
  "No s'ha pogut conciliar";

/**
 * Sends the queued movements one after the other; one failing doesn't stop the rest.
 * @param {object[]} entries
 * @param {(id: number|string, lines: object[]) => Promise} accept
 * @param {(n: number, entry: object, error?: string) => void} [onProgress]
 */
export async function runQueue(entries, accept, onProgress) {
  const done = [];
  const failed = [];
  let n = 0;
  for (const entry of entries) {
    n++;
    try {
      await accept(entry.id, entry.lines);
      done.push(entry.id);
      if (onProgress) onProgress(n, entry);
    } catch (error) {
      const message = errorMessage(error);
      failed.push({ id: entry.id, label: entry.label, message });
      if (onProgress) onProgress(n, entry, message);
    }
  }
  return { done, failed };
}

// «F-10 conciliat · 2 de 5»
export function queueMessage(entry, n, total, error) {
  const progress = total > 1 ? ` · ${n} de ${total}` : "";
  return error ? `${entry.label}: ${error}${progress}` : `${entry.label} conciliat${progress}`;
}
