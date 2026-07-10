import { Schema } from 'effect';
import { FeeInvoiceInput } from '~/features/ebay-fees/schemas';
import { DocumentPreviewInput } from '~/features/sales/schemas';

export const Quarter = Schema.Literal('T1', 'T2', 'T3', 'T4');
export type Quarter = Schema.Schema.Type<typeof Quarter>;

export const DossierParams = Schema.Struct({
  year: Schema.Number,
  quarter: Quarter,
  accountingCurrency: Schema.Literal('EUR'),
});
export type DossierParams = Schema.Schema.Type<typeof DossierParams>;

export const OriginalFeePdf = Schema.Struct({
  invoiceId: Schema.String,
  fileName: Schema.String,
  bytes: Schema.Uint8ArrayFromSelf,
});
export type OriginalFeePdf = Schema.Schema.Type<typeof OriginalFeePdf>;

export const GeneratePackageInput = Schema.Struct({
  params: DossierParams,
  sales: DocumentPreviewInput,
  refunds: DocumentPreviewInput,
  fees: Schema.Array(FeeInvoiceInput),
  feePdfs: Schema.Array(OriginalFeePdf),
});
export type GeneratePackageInput = Schema.Schema.Type<typeof GeneratePackageInput>;

export const GeneratedPackage = Schema.Struct({
  fileName: Schema.String,
  bytes: Schema.Uint8ArrayFromSelf,
  manifest: Schema.Array(Schema.String),
});
export type GeneratedPackage = Schema.Schema.Type<typeof GeneratedPackage>;
