// The password minimum, the same for every tenant. The API checks it all
// (services/password-policy in projectes-v5: also common passwords and the
// person's or entity's name); here only what the forms can say while typing.
import service from "@/service/index";

export const MIN_LENGTH = 10;
export const MAX_BYTES = 72;

export const PASSWORD_HINT =
  `Com a mínim ${MIN_LENGTH} caràcters. Millor una frase de tres o quatre paraules que una paraula amb números; ` +
  "no pot ser una clau comuna ni contenir el teu nom o correu.";

/** The message for the password typed so far, or null if it can be sent. */
export function passwordProblem(password, confirmation) {
  if (!password) return "Cal una clau de pas.";
  if ([...password].length < MIN_LENGTH) return `La clau ha de tenir ${MIN_LENGTH} caràcters com a mínim.`;
  if (new TextEncoder().encode(password).length > MAX_BYTES) return "La clau és massa llarga.";
  if (confirmation !== undefined && password !== confirmation) return "Les dues claus no coincideixen.";
  return null;
}

/** The API's message (e.g. «Aquesta clau és massa comuna…»), or the fallback. */
export function apiMessage(error, fallback) {
  const data = error && error.response && error.response.data;
  return data && typeof data.message === "string" && data.message ? data.message : fallback;
}

/** A random password nobody sees, for a user who will choose hers by the link. */
export function randomPassword() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[^A-Za-z0-9]/g, "").slice(0, 28) + "-x9";
}

/** Sends the e-mail with the link to choose a new password. */
export function sendPasswordLink(email) {
  return service().post("auth/forgot-password", { email });
}

// Login.vue keeps the API's `passwordWeak` for App.vue's notice, once per login
const WEAK_KEY = "passwordWeak";

export function rememberWeakPassword(weak) {
  try {
    if (weak) sessionStorage.setItem(WEAK_KEY, "1");
    else sessionStorage.removeItem(WEAK_KEY);
  } catch (e) {
    // no notice
  }
}

/** True once after a login with a weak password. */
export function takeWeakPasswordNotice() {
  try {
    const weak = sessionStorage.getItem(WEAK_KEY) === "1";
    sessionStorage.removeItem(WEAK_KEY);
    return weak;
  } catch (e) {
    return false;
  }
}
