// «Esborrar projecte» only sends the project to the trash (`trashed`, via
// `published_at: null`): the dialog said it was deleted for good (issues/135).
// A project with documents or logged hours can't go there (2026-11-06): the
// backend refuses it and names what it has (services/project-trash.js).
export const projectTrashDialog = {
  title: 'Esborrar el projecte?',
  message: "S'enviarà a la paperera el projecte",
  detail: "Deixarà de sortir als llistats i als informes, amb les seves previsions. Només es pot esborrar si no té documents ni hores. No es pot recuperar des de l'aplicació: si cal, demana-ho a suport.",
  canUndo: true
}

/** What to tell when the trash was refused: the backend's reason, or a generic one. */
export function projectTrashErrorMessage (err) {
  const message = err && err.response && err.response.data && err.response.data.error && err.response.data.error.message
  return message || "No s'ha pogut esborrar el projecte"
}
