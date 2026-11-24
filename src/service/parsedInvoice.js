// What the invoice-parser returns, turned into what the document form needs.
// The parser (invoice-parser service) gives net/gross prices, VAT and IRPF per
// line and `checks.problems` when the lines don't add up (2026-11-06 benchmark).

const compact = (value) =>
  String(value || "")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase();

// "ESB73347494" and "B73347494", "IE4276970QH" and "4276970QH" are the same id:
// EU VAT numbers add the country code in front of the national one.
// A Spanish NIF has 9 characters, so only longer ids can carry a country code.
const withoutCountry = (id) => (/^[A-Z]{2}/.test(id) && id.length >= 10 ? id.slice(2) : id);

export function taxIdsMatch(a, b) {
  const x = compact(a);
  const y = compact(b);
  if (!x || !y) return false;
  return x === y || withoutCountry(x) === y || x === withoutCountry(y);
}

export function findContactByTaxId(contacts, taxId) {
  if (!compact(taxId)) return null;
  return (contacts || []).find((c) => taxIdsMatch(c.nif, taxId)) || null;
}

// Fallback when the tax id finds nobody: a contact whose name contains the
// vendor name, ignoring case ("Acme" finds "ACME SL").
export function findContactByName(contacts, name) {
  const wanted = String(name || "").trim().toLowerCase();
  if (!wanted) return null;
  return (contacts || []).find((c) => c.name && c.name.toLowerCase().includes(wanted)) || null;
}

// The contact the form selects: by tax id first, then by name.
export function matchVendorContact(contacts, data) {
  if (!data) return null;
  return findContactByTaxId(contacts, data.vendor_tax_id) || findContactByName(contacts, data.vendor_name);
}

// New provider from the PDF: name and NIF as printed, typed «Proveïdora» when
// the tenant has that contact type.
export function newVendorContact(data, contactTypes) {
  const name = String((data && data.vendor_name) || "").trim();
  if (!name) return null;
  const type = (contactTypes || []).find((t) => /^prove/i.test(String(t.name || "")));
  return {
    name,
    nif: (data.vendor_tax_id && String(data.vendor_tax_id).trim()) || null,
    contact_types: type ? [type.id] : [],
  };
}

const num = (v, fallback = 0) => {
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
};

/** Form lines (base = net unit price, vat and irpf in %). */
export function linesFromParsedInvoice(data) {
  if (!data || !Array.isArray(data.line_items)) return [];
  const pricesIncludeTax = data.prices_include_tax === true;
  return data.line_items.map((item) => {
    const vat = num(item.vat_rate);
    let unitPrice = num(item.unit_price);
    // printed with VAT included: the form expects the tax base
    if (pricesIncludeTax && vat > 0) unitPrice = unitPrice / (1 + vat / 100);
    return {
      concept: item.description || "",
      quantity: num(item.quantity, 1) || 1,
      base: Math.round(unitPrice * 10000) / 10000,
      discount: 0,
      vat,
      irpf: Math.abs(num(item.irpf_rate)),
      comments: "",
      show: false,
      date: new Date(),
      product: null,
      productSearch: "",
    };
  });
}

const PROBLEM_TEXTS = {
  lines_vs_total: "Les línies no sumen el total de la factura.",
  lines_vs_subtotal: "Les línies no sumen la base imposable de la factura.",
  no_lines: "No s'ha trobat cap línia amb preu.",
  no_total: "No s'ha trobat el total de la factura.",
  no_date: "No s'ha trobat la data de la factura.",
};

/** Warnings to show before applying (the missing NIF already has its own notice). */
export function parsedInvoiceWarnings(data) {
  const problems = (data && data.checks && data.checks.problems) || [];
  return problems.filter((p) => PROBLEM_TEXTS[p]).map((p) => PROBLEM_TEXTS[p]);
}
