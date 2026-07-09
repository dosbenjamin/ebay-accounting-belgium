import { Effect } from "effect";
import { useActionData } from "react-router";
import { DocumentUploadPanel } from "~/features/sales/components/document-upload-panel";
import { salesErrorMessages } from "~/features/sales/messages";
import type { ColumnMapping } from "~/features/sales/schemas";
import { previewDocument } from "~/features/sales/service";
import { generateRefundsPdf } from "~/features/generation/service";
import { LiveWorkerLayer } from "~/shared/effect/layers.server";
import { InputValidationError, readFormData, readFormObject } from "~/shared/effect/validation";
import { error, type ViewMessage } from "~/shared/errors/messages";
import { validationErrorMessages } from "~/shared/errors/validation";
import { DocumentActionForm, type DocumentActionForm as DocumentActionFormType } from "./schemas";

export const loader = async () => ({ step: "refunds" });

type ActionData =
  | {
      readonly ok: true;
      readonly data: {
        readonly totalRows: number;
        readonly totalEur: number;
        readonly euTotal: number;
        readonly nonEuTotal: number;
      };
      readonly messages: readonly ViewMessage[];
    }
  | { readonly ok: false; readonly messages: readonly ViewMessage[] };

const pdfResponse = (bytes: Uint8Array, fileName: string): Response => {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${fileName}"`,
    },
  });
};

const optional = (value: string | undefined): string | undefined => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
};

const valueOrDefault = (value: string | undefined, fallback: string): string =>
  optional(value) ?? fallback;

const buildMapping = (form: DocumentActionFormType) => {
  const requiredMapping = {
    date: valueOrDefault(form.date, "Date de création de la transaction"),
    orderNumber: valueOrDefault(form.orderNumber, "Numéro de commande"),
    country: valueOrDefault(form.country, "Pays de livraison"),
    currency: valueOrDefault(form.currency, "Devise du versement"),
    amount: valueOrDefault(form.amount, "Montant net"),
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
  missingMessage: string,
): Effect.Effect<readonly File[], InputValidationError> => {
  const files = formData
    .getAll("documentCsv")
    .filter((value): value is File => value instanceof File && value.name.trim().length > 0);
  return files.length > 0
    ? Effect.succeed(files)
    : Effect.fail(
        new InputValidationError({
          scope: "form",
          message: missingMessage,
        }),
      );
};

export const action = async ({ request }: { request: Request }): Promise<ActionData | Response> => {
  const program = Effect.gen(function* () {
    const formData = yield* readFormData(request);
    const form = yield* readFormObject(formData, DocumentActionForm);
    const files = yield* readCsvFiles(formData, "Ajoutez au moins un CSV de remboursements.");
    const mapping = buildMapping(form);
    const documents = yield* Effect.all(
      files.map((file) =>
        Effect.promise(async () => ({
          fileName: file.name,
          csvText: await file.text(),
          mapping,
          keptColumns: [],
        })),
      ),
    );
    const result = yield* previewDocument({
      kind: "refunds",
      documents,
    });
    if (form.intent === "pdf") {
      const bytes = yield* generateRefundsPdf({
        refunds: result.data,
        generatedOn: new Date().toISOString().slice(0, 10),
      });
      return pdfResponse(bytes, "remboursements_etape.pdf");
    }
    return result;
  }).pipe(
    Effect.provide(LiveWorkerLayer),
    Effect.match({
      onFailure: (cause) => ({
        ok: false as const,
        messages:
          cause._tag === "InputValidationError"
            ? validationErrorMessages(cause)
            : cause._tag === "PdfGenerationError"
              ? [error("refunds-pdf-generation", cause.message, { fileName: cause.fileName })]
            : salesErrorMessages(cause),
      }),
      onSuccess: (result) =>
        result instanceof Response
          ? result
          : {
              ok: true as const,
              data: result.data,
              messages: result.messages,
            },
    }),
  );

  return Effect.runPromise(program);
};

export default function RefundsRoute() {
  const actionData = useActionData<typeof action>();
  return (
    <DocumentUploadPanel
      title="Upload remboursements"
      description="Ajoutez un ou plusieurs CSV de remboursements eBay. Les colonnes standard du rapport sont detectees automatiquement."
      documentType="refunds"
      messages={actionData?.messages ?? []}
      summary={actionData?.ok ? actionData.data : undefined}
    />
  );
}
