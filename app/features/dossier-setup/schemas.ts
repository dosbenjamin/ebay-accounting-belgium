import { Schema } from 'effect';

export const SetupForm = Schema.Struct({
  year: Schema.NumberFromString,
  quarter: Schema.Literal('T1', 'T2', 'T3', 'T4'),
  accountingCurrency: Schema.Literal('EUR'),
});
export type SetupForm = Schema.Schema.Type<typeof SetupForm>;
