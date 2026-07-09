import { Effect } from "effect";
import { CsvParser } from "~/shared/csv/service";
import { ExchangeRateProvider } from "~/shared/exchange-rates/service";
import { parseMoneyAmount, round2, toEur } from "~/shared/money/money";
import {
  FeeMappingError,
  FeePreviewError,
  MissingExchangeRateError,
  type EbayFeesError,
} from "./errors";
import { feePreviewSuccess } from "./messages";
import type { FeeCurrencyTotal, FeeInvoiceInput, FeeInvoicePreview } from "./schemas";

const frenchMonthNames = new Set([
  "janvier",
  "fevrier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
  "décembre",
]);

const requireColumn = (
  row: Record<string, string>,
  fileName: string,
  column: string,
): Effect.Effect<string, FeeMappingError> =>
  Object.prototype.hasOwnProperty.call(row, column)
    ? Effect.succeed(row[column] ?? "")
    : Effect.fail(new FeeMappingError({ fileName, column }));

const normalizePeriodLine = (line: string): string =>
  line
    .replace(/^\uFEFF/, "")
    .replace(/\u00A0/g, " ")
    .trim();

const startsWithPeriodLabel = (line: string): boolean =>
  line
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .startsWith("periode");

export const inferEbayInvoicePeriod = (
  csvText: string,
  fileName: string,
): Effect.Effect<{ readonly month: string; readonly year: number }, FeePreviewError> =>
  Effect.gen(function* () {
    const periodLine = csvText.split(/\r?\n/).map(normalizePeriodLine).find(startsWithPeriodLabel);

    const periodMatch = periodLine?.match(/au\s+\d{1,2}\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})\b/i);
    const month = periodMatch?.[1]?.toLocaleLowerCase("fr-FR");
    const year = Number(periodMatch?.[2]);

    if (!month || !frenchMonthNames.has(month) || !Number.isInteger(year)) {
      return yield* Effect.fail(
        new FeePreviewError({
          message: `La période de facture est introuvable dans ${fileName}. Vérifiez que le CSV eBay contient la ligne "Période".`,
        }),
      );
    }

    return { month, year };
  });

export const previewFeeInvoice = (
  input: FeeInvoiceInput,
): Effect.Effect<
  { readonly data: FeeInvoicePreview; readonly messages: ReturnType<typeof feePreviewSuccess> },
  EbayFeesError,
  CsvParser | ExchangeRateProvider
> =>
  Effect.gen(function* () {
    const parser = yield* CsvParser;
    const exchangeRates = yield* ExchangeRateProvider;
    const parsed = yield* parser
      .parse(input.csvText, input.csvFileName)
      .pipe(
        Effect.mapError(
          () => new FeePreviewError({ message: `Impossible de lire ${input.csvFileName}.` }),
        ),
      );
    const manualRates = new Map(
      input.manualRates.map((rate) => [rate.currency.toUpperCase(), rate.rateToEur]),
    );
    const currencyOriginalTotals = new Map<string, number>();
    const currencyEurTotals = new Map<string, number>();

    for (const row of parsed.rows) {
      const currency = (yield* requireColumn(
        row,
        input.csvFileName,
        input.mapping.currency,
      )).toUpperCase();
      const amountRaw = yield* requireColumn(row, input.csvFileName, input.mapping.amount);
      const amount = yield* parseMoneyAmount(amountRaw, input.mapping.amount).pipe(
        Effect.mapError(
          () =>
            new FeePreviewError({
              message: `Montant invalide dans ${input.csvFileName}.`,
            }),
        ),
      );

      currencyOriginalTotals.set(
        currency,
        round2((currencyOriginalTotals.get(currency) ?? 0) + amount),
      );

      if (input.mapping.eurAmount) {
        const eurRaw = yield* requireColumn(row, input.csvFileName, input.mapping.eurAmount);
        const eurAmount = yield* parseMoneyAmount(eurRaw, input.mapping.eurAmount).pipe(
          Effect.mapError(
            () =>
              new FeePreviewError({
                message: `Montant EUR invalide dans ${input.csvFileName}.`,
              }),
          ),
        );
        currencyEurTotals.set(currency, round2((currencyEurTotals.get(currency) ?? 0) + eurAmount));
      }
    }

    const totalsByCurrency: FeeCurrencyTotal[] = [];
    for (const [currency, originalTotal] of currencyOriginalTotals.entries()) {
      if (input.manualTotalEur && currencyOriginalTotals.size === 1) {
        totalsByCurrency.push({
          currency,
          originalTotal,
          rateToEur: round2(input.manualTotalEur / originalTotal),
          eurTotal: round2(input.manualTotalEur),
          rateSource: "manual_total",
        });
        continue;
      }

      const csvEurTotal = currencyEurTotals.get(currency);
      if (csvEurTotal !== undefined) {
        totalsByCurrency.push({
          currency,
          originalTotal,
          rateToEur: originalTotal === 0 ? 0 : round2(csvEurTotal / originalTotal),
          eurTotal: csvEurTotal,
          rateSource: "csv_eur_amount",
        });
        continue;
      }

      const manualRate = manualRates.get(currency);
      if (manualRate !== undefined) {
        totalsByCurrency.push({
          currency,
          originalTotal,
          rateToEur: manualRate,
          eurTotal: toEur(originalTotal, manualRate),
          rateSource: "manual_rate",
        });
        continue;
      }

      const liveRate = yield* exchangeRates
        .rateToEur(currency)
        .pipe(
          Effect.catchTag("ExchangeRateLookupError", () =>
            Effect.fail(new MissingExchangeRateError({ invoiceId: input.invoiceId, currency })),
          ),
        );
      totalsByCurrency.push({
        currency,
        originalTotal,
        rateToEur: liveRate,
        eurTotal: toEur(originalTotal, liveRate),
        rateSource: "live_ecb",
      });
    }

    const totalEur = round2(totalsByCurrency.reduce((sum, item) => sum + item.eurTotal, 0));

    return {
      data: {
        invoiceId: input.invoiceId,
        month: input.month,
        year: input.year,
        totalsByCurrency,
        totalEur,
      },
      messages: feePreviewSuccess(input.invoiceId, totalEur),
    };
  });
