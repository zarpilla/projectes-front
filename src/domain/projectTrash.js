// «Esborrar projecte» only sends the project to the trash (`trashed`, via
// `published_at: null`): the dialog said it was deleted for good (issues/135).
export const projectTrashDialog = {
  title: 'Esborrar el projecte?',
  message: "S'enviarà a la paperera el projecte",
  detail: "Deixarà de sortir als llistats i als informes. No es pot recuperar des de l'aplicació: si cal, demana-ho a suport.",
  canUndo: true
}
