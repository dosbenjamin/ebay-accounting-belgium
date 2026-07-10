import { Effect, Schema } from 'effect';
import { ebayInvoiceFeeCsvMapping } from '~/features/ebay-fees/schemas';
import { inferEbayInvoicePeriod } from '~/features/ebay-fees/service';
import { GeneratePackageInput } from '~/features/generation/schemas';
import { generateQuarterPackage } from '~/features/generation/service';
import type { ColumnMapping } from '~/features/sales/schemas';
import { InputValidationError, readFormObject } from '~/shared/effect/validation';
import {
  maxCsvFileBytes,
  maxFeeInvoices,
  maxPdfFileBytes,
  maxRefundCsvFiles,
  maxSalesCsvFiles,
  UploadValidationError,
  uploadedFiles,
  validateFileCount,
  validateFiles,
} from '~/shared/files/upload';

const UploadParamsForm = Schema.Struct({
  year: Schema.NumberFromString,
  quarter: Schema.Literal('T1', 'T2', 'T3', 'T4'),
  accountingCurrency: Schema.Literal('EUR'),
});

const UploadFeesForm = Schema.Struct({
  invoiceCount: Schema.NumberFromString,
});

const defaultDocumentMapping: ColumnMapping = {
  date: 'Date de création de la transaction',
  orderNumber: 'Numéro de commande',
  country: 'Pays de livraison',
  currency: 'Devise du versement',
  amount: 'Montant net',
};

const requireFiles = (
  formData: FormData,
  fieldName: string,
  message: string,
): Effect.Effect<readonly File[], InputValidationError> =>
  Effect.succeed(uploadedFiles(formData, fieldName)).pipe(
    Effect.filterOrFail(
      (files) => files.length > 0,
      () => new InputValidationError({ scope: 'form', message }),
    ),
  );

const readCsvDocuments = Effect.fn('generation.readCsvDocuments')(function* (
  files: readonly File[],
) {
  return yield* Effect.all(
    files.map((file) =>
      Effect.promise(async () => ({
        fileName: file.name,
        csvText: await file.text(),
        mapping: defaultDocumentMapping,
        keptColumns: [],
      })),
    ),
  );
});

const invoiceIdFromFileName = (fileName: string, index: number): string => {
  const match = fileName.match(/invoiceId[-_](\d+)/i) ?? fileName.match(/(\d{6,})/);
  return match?.[1] ?? `facture-${index + 1}`;
};

const invoiceIdSourceFileName = (csv: File, pdf: File): string => {
  if (csv.name.length > 0) {
    return csv.name;
  }
  return pdf.name;
};

const readFeePair = Effect.fn('generation.readFeePair')(function* (
  formData: FormData,
  index: number,
) {
  yield* Effect.annotateCurrentSpan('invoice.index', index);
  const files = uploadedFiles(formData, `invoiceFiles_${index}`);
  yield* Effect.annotateCurrentSpan('invoice.file_count', files.length);
  yield* Effect.succeed(files).pipe(
    Effect.filterOrFail(
      (items) => items.length <= 2,
      () =>
        new UploadValidationError({
          message: `Facture frais ${index + 1}: ajoutez exactement deux fichiers, le PDF officiel et le CSV de frais.`,
        }),
    ),
  );

  const pdf = files.find(isPdfFile);
  const csv = files.find(isCsvFile);
  return yield* Effect.succeed({ pdf, csv }).pipe(
    Effect.filterOrFail(
      (pair): pair is { readonly pdf: File; readonly csv: File } => Boolean(pair.pdf && pair.csv),
      () =>
        new InputValidationError({
          scope: 'form',
          message: `Facture frais ${index + 1}: ajoutez le PDF officiel et le CSV de frais.`,
        }),
    ),
  );
});

const isPdfFile = (file: File): boolean =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

const isCsvFile = (file: File): boolean =>
  file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv');

const validateInvoiceCount = Effect.fn('generation.validateInvoiceCount')(function* (
  invoiceCount: number,
) {
  yield* Effect.annotateCurrentSpan('invoice.count', invoiceCount);
  return yield* Effect.succeed(invoiceCount).pipe(
    Effect.filterOrFail(
      (count) => Number.isInteger(count) && count >= 1,
      () =>
        new InputValidationError({
          scope: 'form',
          message: 'Ajoutez au moins une facture de frais eBay.',
        }),
    ),
    Effect.filterOrFail(
      (count) => count <= maxFeeInvoices,
      () =>
        new UploadValidationError({
          message: `Factures frais eBay: ajoutez au maximum ${maxFeeInvoices} factures.`,
        }),
    ),
  );
});

export const zipResponse = (bytes: Uint8Array, fileName: string): Response => {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${fileName}"`,
    },
  });
};

export const generatePackageFromUploadForm = Effect.fn('generation.generatePackageFromUploadForm')(
  function* (formData: FormData) {
    const params = yield* readFormObject(formData, UploadParamsForm);
    const feesForm = yield* readFormObject(formData, UploadFeesForm);
    yield* Effect.annotateCurrentSpan('dossier.year', params.year);
    yield* Effect.annotateCurrentSpan('dossier.quarter', params.quarter);
    const salesFiles = yield* requireFiles(
      formData,
      'salesCsv',
      'Ajoutez au moins un CSV de ventes.',
    );
    const refundFiles = uploadedFiles(formData, 'refundCsv');
    yield* Effect.annotateCurrentSpan('sales.file_count', salesFiles.length);
    yield* Effect.annotateCurrentSpan('refund.file_count', refundFiles.length);
    yield* validateFiles(salesFiles, {
      maxCount: maxSalesCsvFiles,
      maxBytes: maxCsvFileBytes,
      label: 'CSV ventes',
    });
    yield* validateFiles(refundFiles, {
      maxCount: maxRefundCsvFiles,
      maxBytes: maxCsvFileBytes,
      label: 'CSV remboursements',
    });

    const invoiceCount = yield* validateInvoiceCount(feesForm.invoiceCount);

    const fees = [];
    const feePdfs = [];
    const seenFeeInvoiceIds = new Set<string>();
    for (let index = 0; index < invoiceCount; index += 1) {
      const { pdf, csv } = yield* readFeePair(formData, index);
      yield* validateFileCount([pdf, csv], 2, `Facture frais ${index + 1}`);
      yield* validateFiles([csv], {
        maxCount: 1,
        maxBytes: maxCsvFileBytes,
        label: `CSV frais ${index + 1}`,
      });
      yield* validateFiles([pdf], {
        maxCount: 1,
        maxBytes: maxPdfFileBytes,
        label: `PDF frais ${index + 1}`,
      });
      const invoiceId = invoiceIdFromFileName(invoiceIdSourceFileName(csv, pdf), index);
      if (seenFeeInvoiceIds.has(invoiceId)) {
        continue;
      }
      seenFeeInvoiceIds.add(invoiceId);

      const csvText = yield* Effect.promise(() => csv.text());
      const period = yield* inferEbayInvoicePeriod(csvText, csv.name);
      fees.push({
        invoiceId,
        month: period.month,
        year: period.year,
        originalPdfFileName: pdf.name,
        csvText,
        csvFileName: csv.name,
        mapping: ebayInvoiceFeeCsvMapping,
        manualRates: [],
      });
      feePdfs.push({
        invoiceId,
        fileName: pdf.name,
        bytes: new Uint8Array(yield* Effect.promise(() => pdf.arrayBuffer())),
      });
    }

    const input = yield* Schema.decodeUnknown(GeneratePackageInput)({
      params,
      sales: {
        kind: 'sales',
        documents: yield* readCsvDocuments(salesFiles),
      },
      refunds: {
        kind: 'refunds',
        documents: yield* readCsvDocuments(refundFiles),
      },
      fees,
      feePdfs,
    }).pipe(
      Effect.mapError(
        () =>
          new UploadValidationError({
            message:
              'Le formulaire uploadé est incomplet ou incohérent. Vérifiez les fichiers puis réessayez.',
          }),
      ),
    );

    return yield* generateQuarterPackage(input);
  },
);
