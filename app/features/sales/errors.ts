import { Data } from 'effect';

export class ColumnMappingError extends Data.TaggedError('ColumnMappingError')<{
  readonly fileName: string;
  readonly column: string;
}> {}

export class DocumentPreviewError extends Data.TaggedError('DocumentPreviewError')<{
  readonly message: string;
}> {}

export type SalesError = ColumnMappingError | DocumentPreviewError;
