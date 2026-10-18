// issues/158: the app moved from hash URLs (…/stats/#/order/view/15397) to
// plain ones (…/stats/order/view/15397). Printed QR labels, e-mails and
// bookmarks keep the old form and must land on the same page.
import { describe, it, expect, afterEach } from "vitest";
import { legacyHashTarget, redirectLegacyHash } from "@/router/legacyHash";

describe("legacyHashTarget", () => {
  it("moves the path after #/ under the base", () => {
    expect(legacyHashTarget({ hash: "#/order/view/15397" }, "/stats/")).toBe("/stats/order/view/15397");
    expect(legacyHashTarget({ hash: "#/tasks?task=12" }, "/stats/")).toBe("/stats/tasks?task=12");
    expect(legacyHashTarget({ hash: "#/reset-password?code=abc" }, "/stats")).toBe("/stats/reset-password?code=abc");
    expect(legacyHashTarget({ hash: "#/" }, "/stats/")).toBe("/stats/");
    expect(legacyHashTarget({ hash: "#/projectes" }, "/")).toBe("/projectes");
  });

  it("leaves plain URLs and in-page anchors alone", () => {
    expect(legacyHashTarget({ hash: "" }, "/stats/")).toBeNull();
    expect(legacyHashTarget({ hash: "#" }, "/stats/")).toBeNull();
    expect(legacyHashTarget({ hash: "#section" }, "/stats/")).toBeNull();
  });
});

describe("redirectLegacyHash", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("rewrites the address before the router reads it", () => {
    window.history.replaceState(null, "", "/stats/#/order/view/15397");
    redirectLegacyHash("/stats/");
    expect(window.location.pathname).toBe("/stats/order/view/15397");
    expect(window.location.hash).toBe("");
  });
});
