import { Data, Effect } from 'effect';

export class UploadValidationError extends Data.TaggedError('UploadValidationError')<{
  readonly message: string;
  readonly fileName?: string;
}> {}

export const maxCsvFileBytes = 5 * 1024 * 1024;
export const maxPdfFileBytes = 10 * 1024 * 1024;
export const maxSalesCsvFiles = 12;
export const maxRefundCsvFiles = 12;
export const maxFeeInvoices = 12;

export const isUploadedFile = (value: FormDataEntryValue | null): value is File =>
  value instanceof File && value.name.trim().length > 0 && value.size > 0;

export const uploadedFiles = (formData: FormData, fieldName: string): readonly File[] =>
  formData.getAll(fieldName).filter(isUploadedFile);

export const validateFileCount = Effect.fn('upload.validateFileCount')(function* (
  files: readonly File[],
  maxCount: number,
  label: string,
) {
  yield* Effect.annotateCurrentSpan('upload.label', label);
  yield* Effect.annotateCurrentSpan('upload.file_count', files.length);
  yield* Effect.annotateCurrentSpan('upload.max_count', maxCount);
  return yield* Effect.succeed(files).pipe(
    Effect.filterOrFail(
      (items) => items.length <= maxCount,
      () =>
        new UploadValidationError({
          message: `${label}: sélectionnez au maximum ${maxCount} fichiers.`,
        }),
    ),
    Effect.asVoid,
  );
});

export const validateFileSize = Effect.fn('upload.validateFileSize')(function* (
  file: File,
  maxBytes: number,
  label: string,
) {
  yield* Effect.annotateCurrentSpan('upload.label', label);
  yield* Effect.annotateCurrentSpan('file.name', file.name);
  yield* Effect.annotateCurrentSpan('file.bytes', file.size);
  return yield* Effect.succeed(file).pipe(
    Effect.filterOrFail(
      (item) => item.size <= maxBytes,
      () =>
        new UploadValidationError({
          fileName: file.name,
          message: `${label}: ${file.name} dépasse la taille maximale de ${Math.floor(maxBytes / 1024 / 1024)} Mo.`,
        }),
    ),
    Effect.asVoid,
  );
});

export const validateFiles = Effect.fn('upload.validateFiles')(function* (
  files: readonly File[],
  input: {
    readonly maxCount: number;
    readonly maxBytes: number;
    readonly label: string;
  },
) {
  return yield* Effect.all(
    [
      validateFileCount(files, input.maxCount, input.label),
      Effect.all(
        files.map((file) => validateFileSize(file, input.maxBytes, input.label)),
        {
          discard: true,
        },
      ),
    ],
    { discard: true },
  );
});
