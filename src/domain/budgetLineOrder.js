// Budget lines of a project phase: their order (issues/345) and the line of
// the document being viewed (issues/344).

// The saved order: by `position`, lines without one (never reordered, or added
// elsewhere) after them in the order they came. Sorts in place and returns it.
export function sortLinesByPosition(lines) {
  if (!Array.isArray(lines)) return lines;
  const indexed = lines.map((line, index) => ({ line, index }));
  const rank = item => {
    const p = item.line && item.line.position;
    return p === null || p === undefined || p === "" ? Infinity : Number(p);
  };
  indexed.sort((a, b) => rank(a) - rank(b) || a.index - b.index);
  indexed.forEach((item, i) => {
    lines[i] = item.line;
  });
  return lines;
}

// Moves the line at `from` to `to` (both indexes in `lines`), in place.
// Returns false when nothing moves.
export function moveLine(lines, from, to) {
  if (!Array.isArray(lines)) return false;
  if (from === to || from < 0 || to < 0 || from >= lines.length || to >= lines.length) return false;
  const [line] = lines.splice(from, 1);
  lines.splice(to, 0, line);
  return true;
}

// The relation each document type is linked through on a line.
const DOCUMENT_FIELD = {
  "emitted-invoices": "invoice",
  "received-incomes": "income",
  "received-grants": "grant",
  "received-invoices": "invoice",
  "received-expenses": "expense",
  tickets: "ticket",
  diets: "diet"
};

// Incomes or expenses: which list of a phase can hold this document type.
export function documentLineKind(documentType) {
  if (["emitted-invoices", "received-incomes", "received-grants"].includes(documentType)) return "incomes";
  if (DOCUMENT_FIELD[documentType]) return "expenses";
  return null;
}

// Whether a line of `kind` ("incomes" / "expenses") is linked to the document
// (type + id). An emitted and a received invoice share the `invoice` field and
// their ids overlap, so the kind has to match too.
export function lineHasDocument(line, kind, documentType, documentId) {
  const field = DOCUMENT_FIELD[documentType];
  if (!line || !field || documentLineKind(documentType) !== kind || documentId === null || documentId === undefined || documentId === "") return false;
  const linked = line[field];
  const linkedId = linked && typeof linked === "object" ? linked.id : linked;
  return linkedId !== null && linkedId !== undefined && String(linkedId) === String(documentId);
}
