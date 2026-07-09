import { describe, expect, it } from "vitest";
import { controlCsvName, ebayFeesPdfName, refundsPdfName, salesPdfName } from "./names";

describe("file names", () => {
  it("generates stable accounting file names", () => {
    expect(salesPdfName(2026, "T2")).toBe("ventes_2026_T2.pdf");
    expect(refundsPdfName(2026, "T2")).toBe("remboursements_2026_T2.pdf");
    expect(controlCsvName(2026, "T2")).toBe("controle_2026_T2.csv");
    expect(ebayFeesPdfName("Mars")).toBe("mars_frais_ebay_avec_annexe_eur.pdf");
    expect(ebayFeesPdfName("Mars", "326781480")).toBe(
      "mars_326781480_frais_ebay_avec_annexe_eur.pdf",
    );
  });
});
