import { Schema } from "effect";

export const EmptyQuery = Schema.Struct({});

export const CsvPreviewQuery = Schema.Struct({
  documentType: Schema.optional(Schema.Literal("sales", "refunds", "fees")),
});

export const WizardSetupActionForm = Schema.Struct({
  year: Schema.NumberFromString,
  quarter: Schema.Literal("T1", "T2", "T3", "T4"),
  accountingCurrency: Schema.Literal("EUR"),
});

export const DocumentActionForm = Schema.Struct({
  intent: Schema.optional(Schema.Literal("preview", "pdf")),
  date: Schema.optional(Schema.String),
  orderNumber: Schema.optional(Schema.String),
  country: Schema.optional(Schema.String),
  currency: Schema.optional(Schema.String),
  amount: Schema.optional(Schema.String),
  shippingFee: Schema.optional(Schema.String),
  sku: Schema.optional(Schema.String),
  quantity: Schema.optional(Schema.String),
});

export const FeesActionForm = Schema.Struct({
  currencyColumn: Schema.NonEmptyString,
  amountColumn: Schema.NonEmptyString,
  eurAmountColumn: Schema.optional(Schema.String),
  usdRate: Schema.optional(Schema.NumberFromString),
});

export type DocumentActionForm = Schema.Schema.Type<typeof DocumentActionForm>;
