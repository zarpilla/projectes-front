import service from "@/service/index";

// Opens the documentation site (esstrapis-docs) already logged in as the current
// user, with her permissions. With `route` (an app route such as "/tresoreria")
// the site opens the chapter that explains that screen. Same flow as the tickets
// link (service/tickets.js): the tab opens inside the click, so popup blockers
// allow it, and is pointed at the single-use URL from the API once it arrives.
export async function openDocs({ route, open = (...args) => window.open(...args), api = service } = {}) {
  const tab = open("", "_blank");
  try {
    const { data } = await api({ requiresAuth: true }).get("me/docs-login", route ? { params: { route } } : undefined);
    const url = data && data.url;
    if (!url || !/^https?:\/\//.test(url)) {
      throw new Error("No s'ha pogut obtenir l'enllaç a la documentació");
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      open(url, "_blank", "noopener");
    }
  } catch (error) {
    if (tab) tab.close();
    throw error;
  }
}

// Message to show when openDocs fails (Strapi 5 error body, or the error itself).
export function docsErrorMessage(error) {
  const apiMessage = error && error.response && error.response.data && error.response.data.error && error.response.data.error.message;
  if (apiMessage === "Documentation is not configured on this instance") return "La documentació no està configurada en aquesta instància";
  return (error && !error.response && error.message) || "No s'ha pogut obrir la documentació";
}
