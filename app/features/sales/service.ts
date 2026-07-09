import { Effect } from "effect";
import { CsvParser } from "~/shared/csv/service";
import { classifyCountry } from "~/shared/countries/eu";
import { round2, parseMoneyAmount } from "~/shared/money/money";
import { ColumnMappingError, DocumentPreviewError, type SalesError } from "./errors";
import { documentPreviewMessages } from "./messages";
import type {
  CountrySummary,
  DocumentOutputRow,
  DocumentPreview,
  DocumentPreviewInput,
} from "./schemas";

const requireColumn = (
  row: Record<string, string>,
  fileName: string,
  column: string,
): Effect.Effect<string, ColumnMappingError> =>
  Object.prototype.hasOwnProperty.call(row, column)
    ? Effect.succeed(row[column] ?? "")
    : Effect.fail(new ColumnMappingError({ fileName, column }));

const readKnownColumn = (
  row: Record<string, string>,
  knownColumn: string,
  fallbackColumn: string,
): string => {
  if (Object.prototype.hasOwnProperty.call(row, knownColumn)) return row[knownColumn] ?? "";
  if (Object.prototype.hasOwnProperty.call(row, fallbackColumn)) return row[fallbackColumn] ?? "";
  return "";
};

const hasAccountingAmount = (value: string): boolean => {
  const normalized = value.trim();
  return normalized.length > 0 && normalized !== "--";
};

const dedupeValue = (row: Record<string, string>, column: string): string =>
  (row[column] ?? "").trim();

const dedupeKey = (
  row: Record<string, string>,
  mapping: DocumentPreviewInput["documents"][number]["mapping"],
): string =>
  [
    dedupeValue(row, mapping.date),
    dedupeValue(row, mapping.orderNumber),
    dedupeValue(row, mapping.country),
    dedupeValue(row, mapping.currency),
    dedupeValue(row, mapping.amount),
    dedupeValue(row, "Numéro de l'objet"),
    dedupeValue(row, "Type de transaction"),
    dedupeValue(row, "Type de frais"),
  ].join("\u001f");

export const previewDocument = (
  input: DocumentPreviewInput,
): Effect.Effect<
  { readonly data: DocumentPreview; readonly messages: ReturnType<typeof documentPreviewMessages> },
  SalesError,
  CsvParser
> =>
  Effect.gen(function* () {
    const parser = yield* CsvParser;
    const byCountry = new Map<string, CountrySummary>();
    let totalRows = 0;
    let totalEur = 0;
    let euTotal = 0;
    let nonEuTotal = 0;
    let unknownTotal = 0;
    let unknownCountryCount = 0;
    const outputRows: DocumentOutputRow[] = [];
    const seenRows = new Set<string>();

    for (const document of input.documents) {
      const parsed = yield* parser
        .parse(document.csvText, document.fileName)
        .pipe(Effect.mapError((e) => new DocumentPreviewError({ message: e.message })));

      for (const row of parsed.rows) {
        const rowKey = dedupeKey(row, document.mapping);
        if (seenRows.has(rowKey)) {
          continue;
        }
        seenRows.add(rowKey);

        const amountRaw = yield* requireColumn(row, document.fileName, document.mapping.amount);
        const countryRaw = yield* requireColumn(row, document.fileName, document.mapping.country);
        outputRows.push({
          createdAt: readKnownColumn(
            row,
            "Date de création de la transaction",
            document.mapping.date,
          ),
          orderNumber: readKnownColumn(row, "Numéro de commande", document.mapping.orderNumber),
          shippingCountry: readKnownColumn(row, "Pays de livraison", document.mapping.country),
          netAmount: amountRaw,
        });

        if (!hasAccountingAmount(amountRaw)) continue;

        const amount = yield* parseMoneyAmount(amountRaw, document.mapping.amount).pipe(
          Effect.mapError(
            () =>
              new DocumentPreviewError({
                message: `Montant invalide dans ${document.fileName}, colonne ${document.mapping.amount}.`,
              }),
          ),
        );
        const country = yield* classifyCountry(countryRaw);

        totalRows += 1;
        totalEur = round2(totalEur + amount);

        if (country.zone === "EU") euTotal = round2(euTotal + amount);
        if (country.zone === "NON_EU") nonEuTotal = round2(nonEuTotal + amount);
        if (country.zone === "UNKNOWN") {
          unknownTotal = round2(unknownTotal + amount);
          unknownCountryCount += 1;
        }

        const previous = byCountry.get(country.normalizedCountry);
        byCountry.set(country.normalizedCountry, {
          country: country.normalizedCountry,
          zone: country.zone,
          count: (previous?.count ?? 0) + 1,
          totalEur: round2((previous?.totalEur ?? 0) + amount),
        });
      }
    }

    return {
      data: {
        kind: input.kind,
        totalRows,
        totalEur,
        byCountry: Array.from(byCountry.values()).sort((a, b) =>
          a.country.localeCompare(b.country),
        ),
        euTotal,
        nonEuTotal,
        unknownTotal,
        outputRows,
      },
      messages: documentPreviewMessages(input.kind, totalRows, unknownCountryCount),
    };
  });
