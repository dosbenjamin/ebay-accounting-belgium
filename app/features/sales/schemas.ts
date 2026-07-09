import { Schema } from 'effect';

export const DocumentKind = Schema.Literal('sales', 'refunds');
export type DocumentKind = Schema.Schema.Type<typeof DocumentKind>;

export const ColumnMapping = Schema.Struct({
  date: Schema.String,
  orderNumber: Schema.String,
  country: Schema.String,
  currency: Schema.String,
  amount: Schema.String,
  shippingFee: Schema.optional(Schema.String),
  sku: Schema.optional(Schema.String),
  quantity: Schema.optional(Schema.String),
});
export type ColumnMapping = Schema.Schema.Type<typeof ColumnMapping>;

export const DocumentCsvInput = Schema.Struct({
  csvText: Schema.String,
  fileName: Schema.String,
  mapping: ColumnMapping,
  keptColumns: Schema.Array(Schema.String),
});
export type DocumentCsvInput = Schema.Schema.Type<typeof DocumentCsvInput>;

export const DocumentPreviewInput = Schema.Struct({
  kind: DocumentKind,
  documents: Schema.Array(DocumentCsvInput),
});
export type DocumentPreviewInput = Schema.Schema.Type<typeof DocumentPreviewInput>;

export const CountrySummary = Schema.Struct({
  country: Schema.String,
  zone: Schema.Literal('EU', 'NON_EU', 'UNKNOWN'),
  count: Schema.Number,
  totalEur: Schema.Number,
});
export type CountrySummary = Schema.Schema.Type<typeof CountrySummary>;

export const DocumentOutputRow = Schema.Struct({
  createdAt: Schema.String,
  orderNumber: Schema.String,
  shippingCountry: Schema.String,
  itemNumber: Schema.String,
});
export type DocumentOutputRow = Schema.Schema.Type<typeof DocumentOutputRow>;

export const DocumentPreview = Schema.Struct({
  kind: DocumentKind,
  totalRows: Schema.Number,
  totalEur: Schema.Number,
  byCountry: Schema.Array(CountrySummary),
  euTotal: Schema.Number,
  nonEuTotal: Schema.Number,
  unknownTotal: Schema.Number,
  outputRows: Schema.Array(DocumentOutputRow),
});
export type DocumentPreview = Schema.Schema.Type<typeof DocumentPreview>;
