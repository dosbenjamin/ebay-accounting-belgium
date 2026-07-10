import { Context, Data, Effect, Layer } from 'effect';

export class ExchangeRateLookupError extends Data.TaggedError('ExchangeRateLookupError')<{
  readonly currency: string;
  readonly message: string;
}> {}

export class ExchangeRateProvider extends Context.Tag('ExchangeRateProvider')<
  ExchangeRateProvider,
  {
    readonly rateToEur: (currency: string) => Effect.Effect<number, ExchangeRateLookupError>;
  }
>() {}

const ecbDailyRatesUrl = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
let ecbDailyRatesPromise: Promise<Map<string, number>> | undefined;

const parseEcbRates = (xml: string): Map<string, number> => {
  const rates = new Map<string, number>([['EUR', 1]]);
  const ratePattern = /<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]\s*\/>/g;
  for (const match of xml.matchAll(ratePattern)) {
    const currency = match[1];
    const eurToCurrency = Number(match[2]);
    if (currency && Number.isFinite(eurToCurrency) && eurToCurrency > 0) {
      rates.set(currency, 1 / eurToCurrency);
    }
  }
  return rates;
};

export const ExchangeRateProviderLive = Layer.succeed(ExchangeRateProvider, {
  rateToEur: Effect.fn('exchangeRates.rateToEur')(function* (currency: string) {
    const normalizedCurrency = currency.toUpperCase();
    yield* Effect.annotateCurrentSpan('currency', normalizedCurrency);
    if (normalizedCurrency === 'EUR') {
      return 1;
    }

    return yield* Effect.tryPromise({
      try: async () => {
        ecbDailyRatesPromise ??= fetch(ecbDailyRatesUrl).then(async (response) => {
          if (!response.ok) {
            throw new Error(`ECB HTTP ${response.status}`);
          }
          return parseEcbRates(await response.text());
        });
        const rates = await ecbDailyRatesPromise.catch((error) => {
          ecbDailyRatesPromise = undefined;
          throw error;
        });
        const rate = rates.get(normalizedCurrency);
        if (rate === undefined) {
          throw new Error(`Currency ${normalizedCurrency} not published by ECB`);
        }
        return rate;
      },
      catch: () =>
        new ExchangeRateLookupError({
          currency: normalizedCurrency,
          message: `Impossible de récupérer le taux BCE pour ${normalizedCurrency}.`,
        }),
    });
  }),
});
