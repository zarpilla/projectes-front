import { describe, it, expect } from "vitest";
import { docTagClass, docTagTitle } from "@/domain/budgetLineDocTag.js";

describe("budget line document tag (issues/364)", () => {
  it("is green when the document is paid and red when pending", () => {
    expect(docTagClass({ id: 1, paid: true })).toContain("is-primary");
    expect(docTagClass({ id: 1, paid: true })).not.toContain("doc-unpaid");
    expect(docTagClass({ id: 1, paid: false })).toContain("doc-unpaid");
    expect(docTagClass({ id: 1 })).toContain("doc-unpaid");
    expect(docTagClass({ id: 1, paid: false })).not.toContain("is-primary");
  });

  it("says the amount and the payment state in the tooltip", () => {
    expect(docTagTitle({ total_base: 540, paid: true }, "incomes")).toBe("540 € · Cobrat");
    expect(docTagTitle({ total_base: 540, paid: false }, "incomes")).toBe("540 € · Pendent de cobrament");
    expect(docTagTitle({ total_base: 12.5, paid: true }, "expenses")).toBe("12.5 € · Pagat");
    expect(docTagTitle({ paid: false }, "expenses")).toBe("Pendent de pagament");
    expect(docTagTitle(null, "expenses")).toBe("");
  });
});
