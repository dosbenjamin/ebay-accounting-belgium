import { Data } from 'effect';
import type { EbayFeesError } from '~/features/ebay-fees/errors';
import type { SalesError } from '~/features/sales/errors';
import type { PdfGenerationError } from '~/shared/pdf/service';
import type { UploadValidationError } from '~/shared/files/upload';
import type { ZipGenerationError } from '~/shared/zip/service';

export class MissingOriginalPdfError extends Data.TaggedError('MissingOriginalPdfError')<{
  readonly invoiceId: string;
}> {}

export type GenerationError =
  | SalesError
  | EbayFeesError
  | PdfGenerationError
  | ZipGenerationError
  | MissingOriginalPdfError
  | UploadValidationError;
