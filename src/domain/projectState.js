// Badge colour for a project state. States are per-tenant data, so the colour
// is picked from words in the name.
export function projectStateClass(state) {
  const name = ((state && state.name) || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (/cancel|denega|rebutja|descarta|perdu/.test(name)) return "is-danger is-light";
  if (/inactiu|tanca|finalitz|acaba|complet|arxiv/.test(name)) return "is-dark is-light";
  if (/pendent|propost|esborrany|prepara|espera|pausa|aturat/.test(name)) return "is-warning is-light";
  if (/actiu|en curs|marxa|aprova|conced/.test(name)) return "is-success is-light";
  return "is-info is-light";
}
