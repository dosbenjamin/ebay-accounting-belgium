import { Data, Effect, Schema } from 'effect';

export const Currency = Schema.String.pipe(Schema.pattern(/^[A-Z]{3}$/));
export type Currency = Schema.Schema.Type<typeof Currency>;

export const Money = Schema.Struct({
  amount: Schema.Number,
  currency: Currency,
});
export type Money = Schema.Schema.Type<typeof Money>;

export class MoneyParseError extends Data.TaggedError('MoneyParseError')<{
  readonly value: string;
  readonly column?: string;
}> {}

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const parseMoneyAmount = (raw: string, column?: string): Effect.Effect<number, MoneyParseError> =>
  Effect.try({
    try: () => {
      const normalized = raw
        .replace(/\s/g, '')
        .replace(/[€$£]/g, '')
        .replace(/(?<=\d),(?=\d{1,2}$)/, '.')
        .replace(/,/g, '');
      const amount = Number(normalized);
      if (!Number.isFinite(amount)) {
        throw new Error('Invalid amount');
      }
      return amount;
    },
    catch: () => new MoneyParseError({ value: raw, ...(column ? { column } : {}) }),
  });

export const toEur = (amount: number, rate: number): number => round2(amount * rate);
