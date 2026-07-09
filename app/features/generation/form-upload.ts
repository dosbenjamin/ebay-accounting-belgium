import { Effect, Schema } from "effect";
import { ebayInvoiceFeeCsvMapping } from "~/features/ebay-fees/schemas";
import { inferEbayInvoicePeriod } from "~/features/ebay-fees/service";
import { generateQuarterPackage } from "~/features/generation/service";
import type { ColumnMapping, DocumentCsvInput } from "~/features/sales/schemas";
import { InputValidationError, readFormObject } from "~/shared/effect/validation";

const UploadParamsForm = Schema.Struct({
  year: Schema.NumberFromString,
  quarter: Schema.Literal("T1", "T2", "T3", "T4"),
  accountingCurrency: Schema.Literal("EUR"),
});

const UploadFeesForm = Schema.Struct({
  invoiceCount: Schema.NumberFromString,
});

const defaultDocumentMapping: ColumnMapping = {
  date: "Date de création de la transaction",
  orderNumber: "Numéro de commande",
  country: "Pays de livraison",
  currency: "Devise du versement",
  amount: "Montant net",
};

const isUploadedFile = (value: FormDataEntryValue | null): value is File =>
  value instanceof File && value.name.trim().length > 0 && value.size > 0;

const uploadedFiles = (formData: FormData, fieldName: string): readonly File[] =>
  formData.getAll(fieldName).filter(isUploadedFile);

const requireFiles = (
  formData: FormData,
  fieldName: string,
  message: string,
): Effect.Effect<readonly File[], InputValidationError> => {
  const files = uploadedFiles(formData, fieldName);
  return files.length > 0
    ? Effect.succeed(files)
    : Effect.fail(new InputValidationError({ scope: "form", message }));
};

const readCsvDocuments = (
  files: readonly File[],
): Effect.Effect<readonly DocumentCsvInput[], never> =>
  Effect.all(
    files.map((file) =>
      Effect.promise(async () => ({
        fileName: file.name,
        csvText: await file.text(),
        mapping: defaultDocumentMapping,
        keptColumns: [],
      })),
    ),
  );

const invoiceIdFromFileName = (fileName: string, index: number): string => {
  const match = fileName.match(/invoiceId[-_](\d+)/i) ?? fileName.match(/(\d{6,})/);
  return match?.[1] ?? `facture-${index + 1}`;
};

const readFeePair = (
  formData: FormData,
  index: number,
): Effect.Effect<{ readonly pdf: File; readonly csv: File }, InputValidationError> => {
  const files = uploadedFiles(formData, `invoiceFiles_${index}`);
  const pdf = files.find(
    (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
  );
  const csv = files.find(
    (file) => file.name.toLowerCase().endsWith(".csv") || file.type.includes("csv"),
  );

  return pdf && csv
    ? Effect.succeed({ pdf, csv })
    : Effect.fail(
        new InputValidationError({
          scope: "form",
          message: `Facture frais ${index + 1}: ajoutez le PDF officiel et le CSV de frais.`,
        }),
      );
};

export const zipResponse = (bytes: Uint8Array, fileName: string): Response => {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
};

export const generatePackageFromUploadForm = (formData: FormData) =>
  Effect.gen(function* () {
    const params = yield* readFormObject(formData, UploadParamsForm);
    const feesForm = yield* readFormObject(formData, UploadFeesForm);
    const salesFiles = yield* requireFiles(
      formData,
      "salesCsv",
      "Ajoutez au moins un CSV de ventes.",
    );
    const refundFiles = uploadedFiles(formData, "refundCsv");

    if (!Number.isInteger(feesForm.invoiceCount) || feesForm.invoiceCount < 1) {
      return yield* Effect.fail(
        new InputValidationError({
          scope: "form",
          message: "Ajoutez au moins une facture de frais eBay.",
        }),
      );
    }

    const fees = [];
    const feePdfs = [];
    for (let index = 0; index < feesForm.invoiceCount; index += 1) {
      const { pdf, csv } = yield* readFeePair(formData, index);
      const csvText = yield* Effect.promise(() => csv.text());
      const period = yield* inferEbayInvoicePeriod(csvText, csv.name);
      const invoiceId = invoiceIdFromFileName(csv.name || pdf.name, index);
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

    return yield* generateQuarterPackage({
      params,
      sales: {
        kind: "sales",
        documents: yield* readCsvDocuments(salesFiles),
      },
      refunds: {
        kind: "refunds",
        documents: yield* readCsvDocuments(refundFiles),
      },
      fees,
      feePdfs,
    });
  });
