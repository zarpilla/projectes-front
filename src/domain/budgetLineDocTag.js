// The document tag in the «Doc.» column of a phase's lines (issues/364): its
// colour says whether the document is paid (green) or still pending (red), as
// ticked in the document's «Pagament» box. The tooltip says it in words.

export function docTagClass(doc) {
  return ["tag", "invoice-tag", "clickable", doc && doc.paid ? "is-primary" : "doc-unpaid"];
}

// kind: "incomes" (collected) or "expenses" (paid)
export function docTagTitle(doc, kind) {
  if (!doc) return "";
  const state =
    kind === "incomes"
      ? doc.paid ? "Cobrat" : "Pendent de cobrament"
      : doc.paid ? "Pagat" : "Pendent de pagament";
  const amount = doc.total_base !== undefined && doc.total_base !== null ? `${doc.total_base} € · ` : "";
  return `${amount}${state}`;
}
