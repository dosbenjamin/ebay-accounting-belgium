import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { CsvParserLive } from "~/shared/csv/service";
import { previewDocument } from "./service";

const mapping = {
  date: "Date",
  orderNumber: "Commande",
  country: "Pays",
  currency: "Devise",
  amount: "Montant",
};

describe("sales aggregation", () => {
  it("aggregates by country and EU zone", async () => {
    const result = await Effect.runPromise(
      previewDocument({
        kind: "sales",
        documents: [
          {
            fileName: "sales.csv",
            csvText:
              "Date,Commande,Pays,Devise,Montant\n2026-01-01,A,BE,EUR,10\n2026-01-02,B,US,EUR,20",
            mapping,
            keptColumns: ["Date", "Commande", "Pays", "Montant"],
          },
        ],
      }).pipe(Effect.provide(CsvParserLive)),
    );

    expect(result.data.totalRows).toBe(2);
    expect(result.data.euTotal).toBe(10);
    expect(result.data.nonEuTotal).toBe(20);
    expect(result.data.outputRows).toEqual([
      {
        createdAt: "2026-01-01",
        orderNumber: "A",
        shippingCountry: "BE",
        netAmount: "10",
      },
      {
        createdAt: "2026-01-02",
        orderNumber: "B",
        shippingCountry: "US",
        netAmount: "20",
      },
    ]);
    expect(result.data.byCountry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ country: "BE", totalEur: 10 }),
        expect.objectContaining({ country: "US", totalEur: 20 }),
      ]),
    );
  });

  it("keeps the net amount for the sales PDF detail table", async () => {
    const result = await Effect.runPromise(
      previewDocument({
        kind: "sales",
        documents: [
          {
            fileName: "sales.csv",
            csvText:
              "Date,Commande,Pays,Devise,Montant,Numéro de l'objet\n2026-01-01,A,BE,EUR,10,116243686154",
            mapping,
            keptColumns: [],
          },
        ],
      }).pipe(Effect.provide(CsvParserLive)),
    );

    expect(result.data.outputRows).toEqual([
      {
        createdAt: "2026-01-01",
        orderNumber: "A",
        shippingCountry: "BE",
        netAmount: "10",
      },
    ]);
  });

  it("keeps eBay detail rows without accounting amount out of totals", async () => {
    const result = await Effect.runPromise(
      previewDocument({
        kind: "sales",
        documents: [
          {
            fileName: "sales.csv",
            csvText: [
              "Date de création de la transaction,Numéro de commande,Pays de livraison,Devise du versement,Montant net,Numéro de l'objet",
              '2026-01-01,A,BE,EUR,"10,00",116243686154',
              "2026-01-01,A,BE,EUR,--,127939286946",
            ].join("\n"),
            mapping: {
              date: "Date de création de la transaction",
              orderNumber: "Numéro de commande",
              country: "Pays de livraison",
              currency: "Devise du versement",
              amount: "Montant net",
            },
            keptColumns: [],
          },
        ],
      }).pipe(Effect.provide(CsvParserLive)),
    );

    expect(result.data.totalRows).toBe(1);
    expect(result.data.totalEur).toBe(10);
    expect(result.data.outputRows).toHaveLength(2);
  });

  it("aggregates several CSV files into the same summary", async () => {
    const result = await Effect.runPromise(
      previewDocument({
        kind: "sales",
        documents: [
          {
            fileName: "sales-1.csv",
            csvText: "Date,Commande,Pays,Devise,Montant\n2026-01-01,A,BE,EUR,10",
            mapping,
            keptColumns: ["Date", "Commande", "Pays", "Montant"],
          },
          {
            fileName: "sales-2.csv",
            csvText:
              "Date,Commande,Pays,Devise,Montant\n2026-01-02,B,BE,EUR,15\n2026-01-03,C,US,EUR,20",
            mapping,
            keptColumns: ["Date", "Commande", "Pays", "Montant"],
          },
        ],
      }).pipe(Effect.provide(CsvParserLive)),
    );

    expect(result.data.totalRows).toBe(3);
    expect(result.data.totalEur).toBe(45);
    expect(result.data.byCountry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ country: "BE", count: 2, totalEur: 25 }),
        expect.objectContaining({ country: "US", count: 1, totalEur: 20 }),
      ]),
    );
  });

  it("deduplicates rows when the same CSV is uploaded more than once", async () => {
    const csvText = "Date,Commande,Pays,Devise,Montant\n2026-01-01,A,BE,EUR,10";

    const result = await Effect.runPromise(
      previewDocument({
        kind: "sales",
        documents: [
          {
            fileName: "sales-1.csv",
            csvText,
            mapping,
            keptColumns: [],
          },
          {
            fileName: "sales-copy.csv",
            csvText,
            mapping,
            keptColumns: [],
          },
        ],
      }).pipe(Effect.provide(CsvParserLive)),
    );

    expect(result.data.totalRows).toBe(1);
    expect(result.data.totalEur).toBe(10);
    expect(result.data.outputRows).toHaveLength(1);
  });
});
