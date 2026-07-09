import { Effect, Schema } from 'effect';
import { generateRefundsPdf, generateSalesPdf, generateSalesRefundsPdf } from '~/features/generation/service';
import { salesErrorMessages } from '~/features/sales/messages';
import type { ColumnMapping, DocumentKind, DocumentPreview } from '~/features/sales/schemas';
import { previewDocument } from '~/features/sales/service';
import { LiveWorkerLayer } from '~/shared/effect/layers.server';
import { InputValidationError, readFormData, readFormObject, readQuery } from '~/shared/effect/validation';
import { apiFailure } from '~/shared/errors/api';
import { error, type ViewMessage } from '~/shared/errors/messages';
import { validationErrorMessages } from '~/shared/errors/validation';
import { DocumentActionForm, type DocumentActionForm as DocumentActionFormType } from './schemas';

const DocumentPdfQuery = Schema.Struct({
  documentType: Schema.Literal('sales', 'refunds'),
});

const optional = (value: string | undefined): string | undefined => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : undefined;
};

const valueOrDefault = (value: string | undefined, fallback: string): string => optional(value) ?? fallback;

const buildMapping = (form: DocumentActionFormType) => {
  const requiredMapping = {
    date: valueOrDefault(form.date, 'Date de création de la transaction'),
    orderNumber: valueOrDefault(form.orderNumber, 'Numéro de commande'),
    country: valueOrDefault(form.country, 'Pays de livraison'),
    currency: valueOrDefault(form.currency, 'Devise du versement'),
    amount: valueOrDefault(form.amount, 'Montant net'),
  };
  const shippingFee = optional(form.shippingFee);
  const sku = optional(form.sku);
  const quantity = optional(form.quantity);
  return {
    ...requiredMapping,
    ...(shippingFee ? { shippingFee } : {}),
    ...(sku ? { sku } : {}),
    ...(quantity ? { quantity } : {}),
  } satisfies ColumnMapping;
};

const readCsvFiles = (
  formData: FormData,
  fieldName: string,
  required: boolean,
): Effect.Effect<readonly File[], InputValidationError> => {
  const files = formData
    .getAll(fieldName)
    .filter((value): value is File => value instanceof File && value.name.trim().length > 0);
  return files.length > 0 || !required
    ? Effect.succeed(files)
    : Effect.fail(
        new InputValidationError({
          scope: 'form',
          message: 'Ajoutez au moins un CSV.',
        }),
      );
};

const documentsFromFiles = (
  files: readonly File[],
  mapping: ColumnMapping,
): Effect.Effect<
  readonly {
    readonly fileName: string;
    readonly csvText: string;
    readonly mapping: ColumnMapping;
    readonly keptColumns: readonly string[];
  }[]
> =>
  Effect.all(
    files.map((file) =>
      Effect.promise(async () => ({
        fileName: file.name,
        csvText: await file.text(),
        mapping,
        keptColumns: [],
      })),
    ),
  );

const emptyPreview = (kind: DocumentKind): DocumentPreview => ({
  kind,
  totalRows: 0,
  totalEur: 0,
  byCountry: [],
  euTotal: 0,
  nonEuTotal: 0,
  unknownTotal: 0,
  outputRows: [],
});

const pdfResponse = (
  bytes: Uint8Array,
  fileName: string,
  summary: {
    readonly totalRows: number;
    readonly totalEur: number;
    readonly euTotal: number;
    readonly nonEuTotal: number;
  },
): Response => {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${fileName}"`,
      'x-document-summary': JSON.stringify(summary),
    },
  });
};

export const action = async ({ request }: { request: Request }) => {
  const toMessages = (
    cause:
      | InputValidationError
      | Parameters<typeof salesErrorMessages>[0]
      | { readonly _tag: 'PdfGenerationError'; readonly message: string; readonly fileName?: string },
  ): readonly ViewMessage[] =>
    cause._tag === 'InputValidationError'
      ? validationErrorMessages(cause)
      : cause._tag === 'PdfGenerationError'
        ? [error('document-pdf-generation', cause.message, { fileName: cause.fileName })]
        : salesErrorMessages(cause);

  const program = Effect.gen(function* () {
    const query = yield* readQuery(request, DocumentPdfQuery);
    const formData = yield* readFormData(request);
    const form = yield* readFormObject(formData, DocumentActionForm);
    const files = yield* readCsvFiles(formData, 'documentCsv', true);
    const refundFiles =
      query.documentType === 'sales' ? yield* readCsvFiles(formData, 'refundCsv', false) : [];
    const mapping = buildMapping(form);
    const documents = yield* documentsFromFiles(files, mapping);
    const result = yield* previewDocument({
      kind: query.documentType,
      documents,
    });
    const refunds =
      query.documentType === 'sales' && refundFiles.length > 0
        ? yield* previewDocument({
            kind: 'refunds',
            documents: yield* documentsFromFiles(refundFiles, mapping),
          })
        : { data: emptyPreview('refunds') };
    const generatedOn = new Date().toISOString().slice(0, 10);
    const bytes =
      query.documentType === 'sales'
        ? yield* generateSalesRefundsPdf({ sales: result.data, refunds: refunds.data, generatedOn })
        : yield* generateRefundsPdf({ refunds: result.data, generatedOn });
    const summary =
      query.documentType === 'sales'
        ? {
            totalRows: result.data.totalRows + refunds.data.totalRows,
            totalEur: result.data.totalEur - Math.abs(refunds.data.totalEur),
            euTotal: result.data.euTotal - Math.abs(refunds.data.euTotal),
            nonEuTotal: result.data.nonEuTotal - Math.abs(refunds.data.nonEuTotal),
          }
        : {
            totalRows: result.data.totalRows,
            totalEur: result.data.totalEur,
            euTotal: result.data.euTotal,
            nonEuTotal: result.data.nonEuTotal,
          };
    return pdfResponse(
      bytes,
      query.documentType === 'sales' ? 'ventes_remboursements_etape.pdf' : 'remboursements_etape.pdf',
      summary,
    );
  }).pipe(
    Effect.provide(LiveWorkerLayer),
    Effect.match({
      onFailure: (cause) => apiFailure(400, toMessages(cause)),
      onSuccess: (response) => response,
    }),
  );

  return Effect.runPromise(program);
};
