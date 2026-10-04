import { Schema } from 'effect';

export const FeeCsvMapping = Schema.Struct({
  currency: Schema.String,
  amount: Schema.String,
  netAmount: Schema.optional(Schema.String),
  vatAmount: Schema.optional(Schema.String),
  eurAmount: Schema.optional(Schema.String),
});
export type FeeCsvMapping = Schema.Schema.Type<typeof FeeCsvMapping>;

export const ebayInvoiceFeeCsvMapping: FeeCsvMapping = {
  currency: 'Devise',
  amount: 'Montant total',
  netAmount: 'Montant net',
  vatAmount: 'Montant de TVA',
};

export const ManualRate = Schema.Struct({
  currency: Schema.String,
  rateToEur: Schema.Number,
});
export type ManualRate = Schema.Schema.Type<typeof ManualRate>;

export const FeeInvoiceInput = Schema.Struct({
  invoiceId: Schema.String,
  month: Schema.String,
  year: Schema.Number,
  originalPdfFileName: Schema.String,
  csvText: Schema.String,
  csvFileName: Schema.String,
  mapping: FeeCsvMapping,
  manualRates: Schema.Array(ManualRate),
  manualTotalEur: Schema.optional(Schema.Number),
});
export type FeeInvoiceInput = Schema.Schema.Type<typeof FeeInvoiceInput>;

export const FeeCurrencyTotal = Schema.Struct({
  currency: Schema.String,
  originalTotal: Schema.Number,
  rateToEur: Schema.Number,
  eurTotal: Schema.Number,
  rateSource: Schema.Literal('csv_eur_amount', 'manual_rate', 'manual_total', 'live_ecb'),
});
export type FeeCurrencyTotal = Schema.Schema.Type<typeof FeeCurrencyTotal>;

export const FeeInvoicePreview = Schema.Struct({
  invoiceId: Schema.String,
  month: Schema.String,
  year: Schema.Number,
  totalsByCurrency: Schema.Array(FeeCurrencyTotal),
  netTotalEur: Schema.Number,
  vatTotalEur: Schema.Number,
  totalEur: Schema.Number,
});
export type FeeInvoicePreview = Schema.Schema.Type<typeof FeeInvoicePreview>;
