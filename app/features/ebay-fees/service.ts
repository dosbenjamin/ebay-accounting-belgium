import { Effect } from 'effect';
import { CsvParser } from '~/shared/csv/service';
import {
  ExchangeRateProvider,
  type ExchangeRateLookupError,
} from '~/shared/exchange-rates/service';
import { parseMoneyAmount, round2, toEur } from '~/shared/money/money';
import { FeeMappingError, FeePreviewError, MissingExchangeRateError } from './errors';
import type { FeeCurrencyTotal, FeeInvoiceInput } from './schemas';

type RateToEur = (currency: string) => Effect.Effect<number, ExchangeRateLookupError>;

const frenchMonthAliases: Readonly<Record<string, string>> = {
  jan: 'janvier',
  janv: 'janvier',
  janvier: 'janvier',
  feb: 'février',
  fevr: 'février',
  fevrier: 'février',
  mar: 'mars',
  mars: 'mars',
  apr: 'avril',
  avr: 'avril',
  avril: 'avril',
  mai: 'mai',
  may: 'mai',
  jun: 'juin',
  juin: 'juin',
  jul: 'juillet',
  juil: 'juillet',
  juillet: 'juillet',
  aug: 'août',
  aout: 'août',
  sep: 'septembre',
  sept: 'septembre',
  septembre: 'septembre',
  oct: 'octobre',
  octobre: 'octobre',
  nov: 'novembre',
  novembre: 'novembre',
  dec: 'décembre',
  decembre: 'décembre',
};

const requireColumn = (
  row: Record<string, string>,
  fileName: string,
  column: string,
): Effect.Effect<string, FeeMappingError> =>
  Object.prototype.hasOwnProperty.call(row, column)
    ? Effect.succeed(row[column] ?? '')
    : Effect.fail(new FeeMappingError({ fileName, column }));

const normalizePeriodLine = (line: string): string =>
  line
    .replace(/^\uFEFF/, '')
    .replace(/\u00A0/g, ' ')
    .trim();

const startsWithPeriodLabel = (line: string): boolean =>
  line
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .startsWith('periode');

const normalizeFrenchMonth = (month: string | undefined): string | undefined => {
  const normalized = month
    ?.toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\.$/, '');

  return normalized ? frenchMonthAliases[normalized] : undefined;
};

export const inferEbayInvoicePeriod = Effect.fn('ebayFees.inferInvoicePeriod')(function* (
  csvText: string,
  fileName: string,
) {
  yield* Effect.annotateCurrentSpan('file.name', fileName);
  const lines = csvText.split(/\r?\n/).map(normalizePeriodLine);
  const periodLine = lines.find(startsWithPeriodLabel);

  const periodMatch = periodLine?.match(/au\s+\d{1,2}\s+([A-Za-zÀ-ÿ]+\.?)\s+(\d{4})\b/i);
  const month = normalizeFrenchMonth(periodMatch?.[1]);
  const year = Number(periodMatch?.[2]);

  if (!month || !Number.isInteger(year)) {
    return yield* Effect.fail(
      new FeePreviewError({
        message: `La période de facture est introuvable dans ${fileName}. Vérifiez que le CSV eBay contient la ligne "Période".`,
      }),
    );
  }

  return { month, year };
});

const manualTotalCurrencyTotal = (input: {
  readonly currency: string;
  readonly originalTotal: number;
  readonly manualTotalEur: number | undefined;
  readonly currencyCount: number;
}): FeeCurrencyTotal | undefined => {
  if (input.manualTotalEur === undefined || input.currencyCount !== 1) {
    return undefined;
  }

  return {
    currency: input.currency,
    originalTotal: input.originalTotal,
    rateToEur: round2(input.manualTotalEur / input.originalTotal),
    eurTotal: round2(input.manualTotalEur),
    rateSource: 'manual_total',
  };
};

const csvCurrencyTotal = (input: {
  readonly currency: string;
  readonly originalTotal: number;
  readonly csvEurTotal: number | undefined;
}): FeeCurrencyTotal | undefined => {
  if (input.csvEurTotal === undefined) {
    return undefined;
  }

  return {
    currency: input.currency,
    originalTotal: input.originalTotal,
    rateToEur: csvRateToEur(input.originalTotal, input.csvEurTotal),
    eurTotal: input.csvEurTotal,
    rateSource: 'csv_eur_amount',
  };
};

const csvRateToEur = (originalTotal: number, csvEurTotal: number): number => {
  if (originalTotal === 0) {
    return 0;
  }
  return round2(csvEurTotal / originalTotal);
};

const manualRateCurrencyTotal = (input: {
  readonly currency: string;
  readonly originalTotal: number;
  readonly manualRate: number | undefined;
}): FeeCurrencyTotal | undefined => {
  if (input.manualRate === undefined) {
    return undefined;
  }

  return {
    currency: input.currency,
    originalTotal: input.originalTotal,
    rateToEur: input.manualRate,
    eurTotal: toEur(input.originalTotal, input.manualRate),
    rateSource: 'manual_rate',
  };
};

const liveCurrencyTotal = (input: {
  readonly invoiceId: string;
  readonly currency: string;
  readonly originalTotal: number;
  readonly exchangeRates: { readonly rateToEur: RateToEur };
}): Effect.Effect<FeeCurrencyTotal, MissingExchangeRateError> =>
  input.exchangeRates.rateToEur(input.currency).pipe(
    Effect.catchTag('ExchangeRateLookupError', () =>
      Effect.fail(
        new MissingExchangeRateError({ invoiceId: input.invoiceId, currency: input.currency }),
      ),
    ),
    Effect.map((liveRate) => ({
      currency: input.currency,
      originalTotal: input.originalTotal,
      rateToEur: liveRate,
      eurTotal: toEur(input.originalTotal, liveRate),
      rateSource: 'live_ecb' as const,
    })),
  );

const resolveCurrencyTotal = (input: {
  readonly invoiceId: string;
  readonly currency: string;
  readonly originalTotal: number;
  readonly currencyCount: number;
  readonly manualTotalEur: number | undefined;
  readonly csvEurTotal: number | undefined;
  readonly manualRate: number | undefined;
  readonly exchangeRates: { readonly rateToEur: RateToEur };
}): Effect.Effect<FeeCurrencyTotal, MissingExchangeRateError> => {
  const localTotal =
    manualTotalCurrencyTotal(input) ?? csvCurrencyTotal(input) ?? manualRateCurrencyTotal(input);

  if (localTotal) {
    return Effect.succeed(localTotal);
  }
  return liveCurrencyTotal(input);
};

export const previewFeeInvoice = Effect.fn('ebayFees.previewFeeInvoice')(function* (
  input: FeeInvoiceInput,
) {
  yield* Effect.annotateCurrentSpan('invoice.id', input.invoiceId);
  yield* Effect.annotateCurrentSpan('invoice.month', input.month);
  yield* Effect.annotateCurrentSpan('invoice.year', input.year);
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
  const currencyNetTotals = new Map<string, number>();
  const currencyVatTotals = new Map<string, number>();
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

    if (input.mapping.netAmount) {
      const netRaw = yield* requireColumn(row, input.csvFileName, input.mapping.netAmount);
      const netAmount = yield* parseMoneyAmount(netRaw, input.mapping.netAmount).pipe(
        Effect.mapError(
          () =>
            new FeePreviewError({
              message: `Montant net invalide dans ${input.csvFileName}.`,
            }),
        ),
      );
      currencyNetTotals.set(currency, round2((currencyNetTotals.get(currency) ?? 0) + netAmount));
    }

    if (input.mapping.vatAmount) {
      const vatRaw = yield* requireColumn(row, input.csvFileName, input.mapping.vatAmount);
      const vatAmount = yield* parseMoneyAmount(vatRaw, input.mapping.vatAmount).pipe(
        Effect.mapError(
          () =>
            new FeePreviewError({
              message: `Montant de TVA invalide dans ${input.csvFileName}.`,
            }),
        ),
      );
      currencyVatTotals.set(currency, round2((currencyVatTotals.get(currency) ?? 0) + vatAmount));
    }

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
    totalsByCurrency.push(
      yield* resolveCurrencyTotal({
        invoiceId: input.invoiceId,
        currency,
        originalTotal,
        currencyCount: currencyOriginalTotals.size,
        manualTotalEur: input.manualTotalEur,
        csvEurTotal: currencyEurTotals.get(currency),
        manualRate: manualRates.get(currency),
        exchangeRates,
      }),
    );
  }

  const totalEur = round2(totalsByCurrency.reduce((sum, item) => sum + item.eurTotal, 0));
  const netTotalEur = round2(
    totalsByCurrency.reduce(
      (sum, item) =>
        sum + toEur(currencyNetTotals.get(item.currency) ?? item.originalTotal, item.rateToEur),
      0,
    ),
  );
  const vatTotalEur = round2(
    totalsByCurrency.reduce(
      (sum, item) => sum + toEur(currencyVatTotals.get(item.currency) ?? 0, item.rateToEur),
      0,
    ),
  );

  return {
    invoiceId: input.invoiceId,
    month: input.month,
    year: input.year,
    totalsByCurrency,
    netTotalEur,
    vatTotalEur,
    totalEur,
  };
});
