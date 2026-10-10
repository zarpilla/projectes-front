// What DocumentForm sends when it saves a document (emitted/received invoices,
// expenses, incomes, quotes, ...).
//
// The form keeps each of its projects whole — phases, budget lines, estimated
// hours — because the user assigns the document to a budget line there, and
// those phases are saved afterwards with their own request (updateProjectPhases).
// The document itself only stores WHICH projects it belongs to, so its request
// carries their ids and nothing else. Sending the projects whole made an invoice
// of a large project a 459 KB upload (issues/016).

/** The reference the backend needs to link a project: its id. */
const projectRef = project =>
  project && typeof project === 'object' && project.id ? { id: project.id } : project

/**
 * The body of a document save. `form` is not modified.
 * @param {object} form DocumentForm's form
 */
export const documentPayload = form => {
  if (!form || !Array.isArray(form.projects)) return form
  return { ...form, projects: form.projects.map(projectRef) }
}
