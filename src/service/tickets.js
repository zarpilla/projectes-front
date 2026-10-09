import service from "@/service/index";

// Opens the tickets site (esstrapis-tickets) already logged in as the current
// user (issues/019). The API builds a single-use login URL; the tab is opened
// synchronously, inside the click, so popup blockers allow it, and pointed at the
// URL once it arrives.
export async function openTickets({ open = (...args) => window.open(...args), api = service } = {}) {
  const tab = open("", "_blank");
  try {
    const { data } = await api({ requiresAuth: true }).get("me/tickets-login");
    const url = data && data.url;
    if (!url || !/^https?:\/\//.test(url)) {
      throw new Error("No s'ha pogut obtenir l'enllaç als tiquets");
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

// Message to show when openTickets fails (Strapi 5 error body, or the error itself).
export function ticketsErrorMessage(error) {
  const apiMessage = error && error.response && error.response.data && error.response.data.error && error.response.data.error.message;
  if (apiMessage === "Tickets are not configured on this instance") return "Els tiquets no estan configurats en aquesta instància";
  if (apiMessage === "Your user has no email address") return "El teu usuari no té adreça de correu";
  return (error && !error.response && error.message) || "No s'ha pogut obrir els tiquets";
}
