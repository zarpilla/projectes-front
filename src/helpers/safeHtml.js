// Text from the database shown with v-html (document comments, footers, the
// payment method text, the contact form text) can hold a little HTML on purpose
// (<br>, <b>, links) but must never run code: anyone who can write those fields
// could otherwise steal the session of whoever opens the document.

const ALLOWED = new Set(["B", "STRONG", "I", "EM", "U", "BR", "P", "DIV", "SPAN", "UL", "OL", "LI", "A", "H1", "H2", "H3", "H4", "SMALL", "HR"]);
// removed with everything inside them
const DROPPED = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "NOSCRIPT", "SVG", "MATH", "LINK", "META", "BASE", "FORM", "INPUT", "BUTTON", "TEXTAREA", "SELECT"]);
const SAFE_HREF = /^(https?:|mailto:|tel:)/i;

export const escapeHtml = text =>
  String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const clean = (node, doc) => {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === 3) continue; // text
    if (child.nodeType !== 1) {
      child.remove(); // comments and the like
      continue;
    }
    const tag = child.tagName.toUpperCase();
    if (DROPPED.has(tag)) {
      child.remove();
      continue;
    }
    clean(child, doc);
    if (!ALLOWED.has(tag)) {
      // unknown tag: keep what it says, not the tag
      child.replaceWith(...child.childNodes);
      continue;
    }
    for (const attr of [...child.attributes]) {
      const keep = tag === "A" && attr.name === "href" && SAFE_HREF.test(attr.value.trim());
      if (!keep) child.removeAttribute(attr.name);
    }
    if (tag === "A") {
      child.setAttribute("target", "_blank");
      child.setAttribute("rel", "noopener noreferrer");
    }
  }
};

// HTML with only formatting tags and safe links
export const sanitizeHtml = html => {
  if (html === null || html === undefined || html === "") return "";
  const doc = new DOMParser().parseFromString(`<body>${String(html)}</body>`, "text/html");
  clean(doc.body, doc);
  return doc.body.innerHTML;
};

// a text field shown with its line breaks (and any formatting it may have)
export const richText = text =>
  sanitizeHtml(String(text ?? "").replace(/(?:\r\n|\r|\n)/g, "<br>"));

// Buefy shows the `message` of its dialogs, snackbars, toasts and notifications
// as HTML, and many messages carry names from the database (a town, a route, a
// project): every message goes through the sanitizer, in one place.
const NOTICES = ["dialog", "snackbar", "toast", "notification"];
const NOTICE_METHODS = ["open", "alert", "confirm", "prompt"];
export const guardBuefyMessages = buefy => {
  if (!buefy) return;
  for (const name of NOTICES) {
    const target = buefy[name];
    if (!target) continue;
    for (const method of NOTICE_METHODS) {
      const original = target[method];
      if (typeof original !== "function" || original.__safe) continue;
      const safe = function (params, ...rest) {
        if (typeof params === "string") return original.call(this, sanitizeHtml(params), ...rest);
        if (params && typeof params.message === "string") return original.call(this, { ...params, message: sanitizeHtml(params.message) }, ...rest);
        return original.call(this, params, ...rest);
      };
      safe.__safe = true;
      target[method] = safe;
    }
  }
};
