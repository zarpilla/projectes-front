// «Omple dades a partir de PDF»: what the invoice-parser returns -> form lines.
// 2026-11-06 benchmark on real received invoices: IRPF was always set to 0,
// EU VAT ids (ESB73347494, IE4276970QH) never matched the contact's NIF, and
// nothing warned when the extracted lines didn't add up to the total.
import { describe, it, expect } from "vitest";
import { taxIdsMatch, findContactByTaxId, linesFromParsedInvoice, parsedInvoiceWarnings } from "@/service/parsedInvoice.js";

describe("taxIdsMatch", () => {
  it("ignores spaces, dashes, dots and case", () => {
    expect(taxIdsMatch("B-73347494", "b73347494")).toBe(true);
    expect(taxIdsMatch("CHE-459.847.656", "CHE459847656")).toBe(true);
  });

  it("matches an id with and without the EU country code", () => {
    expect(taxIdsMatch("ESB73347494", "B73347494")).toBe(true);
    expect(taxIdsMatch("B73347494", "ES B73347494")).toBe(true);
    expect(taxIdsMatch("IE4276970QH", "4276970QH")).toBe(true);
    expect(taxIdsMatch("ES39891236J", "39891236J")).toBe(true);
  });

  it("does not match different ids or empty values", () => {
    expect(taxIdsMatch("B73347494", "B73347495")).toBe(false);
    expect(taxIdsMatch("", "B73347494")).toBe(false);
    expect(taxIdsMatch(null, null)).toBe(false);
  });

  it("finds the contact", () => {
    const contacts = [{ id: 1, nif: "B62844725" }, { id: 2, nif: "4276970QH" }];
    expect(findContactByTaxId(contacts, "IE4276970QH").id).toBe(2);
    expect(findContactByTaxId(contacts, "ESB62844725").id).toBe(1);
    expect(findContactByTaxId(contacts, null)).toBe(null);
  });
});

describe("linesFromParsedInvoice", () => {
  it("keeps the IRPF % of each line (was always 0)", () => {
    const [line] = linesFromParsedInvoice({
      prices_include_tax: false,
      line_items: [{ description: "Eines digitals", quantity: 1, unit_price: 1975, total: 1975, vat_rate: 21, irpf_rate: 15 }],
    });
    expect(line).toMatchObject({ concept: "Eines digitals", quantity: 1, base: 1975, vat: 21, irpf: 15, discount: 0 });
  });

  it("turns VAT-included prices into the tax base", () => {
    const [line] = linesFromParsedInvoice({
      prices_include_tax: true,
      line_items: [{ description: "Premium", quantity: 1, unit_price: 24, total: 24, vat_rate: 21 }],
    });
    expect(line.base).toBe(19.8347);
    expect(line.irpf).toBe(0);
  });

  it("keeps 4-decimal unit prices and quantities", () => {
    const [line] = linesFromParsedInvoice({ line_items: [{ description: "+1 User", quantity: 16, unit_price: 37.4944, vat_rate: 0 }] });
    expect(line.quantity).toBe(16);
    expect(line.base).toBe(37.4944);
    expect(line.vat).toBe(0);
  });

  it("returns no lines when there are none", () => {
    expect(linesFromParsedInvoice({})).toEqual([]);
    expect(linesFromParsedInvoice(null)).toEqual([]);
  });
});

describe("parsedInvoiceWarnings", () => {
  it("explains the parser's problems, except the NIF that has its own notice", () => {
    expect(parsedInvoiceWarnings({ checks: { ok: false, problems: ["lines_vs_total", "no_tax_id"] } })).toEqual(["Les línies no sumen el total de la factura."]);
  });

  it("is empty when the checks pass or the parser is an older version", () => {
    expect(parsedInvoiceWarnings({ checks: { ok: true, problems: [] } })).toEqual([]);
    expect(parsedInvoiceWarnings({ vendor_name: "x" })).toEqual([]);
  });
});
