import {
  Box,
  Button,
  Field,
  FileUpload,
  Grid,
  Heading,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { Effect } from "effect";
import { useState } from "react";
import { useActionData } from "react-router";
import { ebayFeesErrorMessages } from "~/features/ebay-fees/messages";
import { ebayInvoiceFeeCsvMapping, type FeeInvoicePreview } from "~/features/ebay-fees/schemas";
import { inferEbayInvoicePeriod, previewFeeInvoice } from "~/features/ebay-fees/service";
import { LiveWorkerLayer } from "~/shared/effect/layers.server";
import { InputValidationError, readFormData, readFormObject } from "~/shared/effect/validation";
import type { ViewMessage } from "~/shared/errors/messages";
import { validationErrorMessages } from "~/shared/errors/validation";
import { MessageList } from "~/shared/ui/messages";
import { FeesActionForm } from "./schemas";

export const loader = async () => ({ step: "fees" });

type ActionData =
  | {
      readonly ok: true;
      readonly data: readonly FeeInvoicePreview[];
      readonly messages: readonly ViewMessage[];
    }
  | { readonly ok: false; readonly messages: readonly ViewMessage[] };

const isUploadedFile = (value: FormDataEntryValue | null): value is File =>
  value instanceof File && value.name.trim().length > 0 && value.size > 0;

const invoiceIdFromFileName = (fileName: string, index: number): string => {
  const match = fileName.match(/invoiceId[-_](\d+)/i) ?? fileName.match(/(\d{6,})/);
  return match?.[1] ?? `facture-${index + 1}`;
};

const readInvoiceFiles = (
  formData: FormData,
  index: number,
): Effect.Effect<{ readonly pdf: File; readonly csv: File }, InputValidationError> => {
  const files = formData.getAll(`invoiceFiles_${index}`).filter(isUploadedFile);
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
          message: `Facture ${index + 1}: ajoutez le PDF officiel et le CSV de frais.`,
        }),
      );
};

export const action = async ({ request }: { request: Request }): Promise<ActionData> => {
  const program = Effect.gen(function* () {
    const formData = yield* readFormData(request);
    const form = yield* readFormObject(formData, FeesActionForm);
    if (!Number.isInteger(form.invoiceCount) || form.invoiceCount < 1) {
      return yield* Effect.fail(
        new InputValidationError({
          scope: "form",
          message: "Ajoutez au moins une facture de frais eBay.",
        }),
      );
    }

    const previews = [];
    const messages: ViewMessage[] = [];
    const seenInvoiceIds = new Set<string>();
    for (let index = 0; index < form.invoiceCount; index += 1) {
      const { pdf, csv } = yield* readInvoiceFiles(formData, index);
      const invoiceId = invoiceIdFromFileName(csv.name || pdf.name, index);
      if (seenInvoiceIds.has(invoiceId)) {
        continue;
      }
      seenInvoiceIds.add(invoiceId);

      const csvText = yield* Effect.promise(() => csv.text());
      const period = yield* inferEbayInvoicePeriod(csvText, csv.name);
      const preview = yield* previewFeeInvoice({
        invoiceId,
        month: period.month,
        year: period.year,
        originalPdfFileName: pdf.name,
        csvText,
        csvFileName: csv.name,
        mapping: ebayInvoiceFeeCsvMapping,
        manualRates: [],
      });
      previews.push(preview.data);
      messages.push(...preview.messages);
    }

    return { data: previews, messages };
  }).pipe(
    Effect.provide(LiveWorkerLayer),
    Effect.match({
      onFailure: (cause) => ({
        ok: false as const,
        messages:
          cause._tag === "InputValidationError"
            ? validationErrorMessages(cause)
            : ebayFeesErrorMessages(cause),
      }),
      onSuccess: (result) => ({
        ok: true as const,
        data: result.data,
        messages: result.messages,
      }),
    }),
  );

  return Effect.runPromise(program);
};

export default function FeesRoute() {
  const actionData = useActionData<typeof action>();
  const [invoiceRows, setInvoiceRows] = useState([0]);
  const totalEur = actionData?.ok
    ? actionData.data.reduce((sum, invoice) => sum + invoice.totalEur, 0)
    : 0;

  return (
    <Stack gap="5">
      <Box>
        <Heading size="lg">Frais eBay</Heading>
        <Text color="gray.600">
          Pour chaque facture, ajoutez le PDF officiel et le CSV de frais correspondant.
        </Text>
      </Box>
      <MessageList messages={actionData?.messages ?? []} />
      {actionData?.ok ? (
        <Stack gap="4">
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p="4">
            <Text color="gray.600" textStyle="sm">
              Total frais
            </Text>
            <Text fontWeight="700">{totalEur.toFixed(2)} EUR</Text>
          </Box>
          {actionData.data.map((invoice) => (
            <Box
              key={invoice.invoiceId}
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="md"
              p="4"
            >
              <Text color="gray.600" textStyle="sm">
                {invoice.month} {invoice.year}
              </Text>
              <Text fontWeight="700">{invoice.totalEur.toFixed(2)} EUR</Text>
              <Table.Root size="sm" mt="4">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Devise</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Montant</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Taux EUR</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Total EUR</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {invoice.totalsByCurrency.map((row) => (
                    <Table.Row key={row.currency}>
                      <Table.Cell>{row.currency}</Table.Cell>
                      <Table.Cell textAlign="end">{row.originalTotal.toFixed(2)}</Table.Cell>
                      <Table.Cell textAlign="end">{row.rateToEur.toFixed(6)}</Table.Cell>
                      <Table.Cell textAlign="end">{row.eurTotal.toFixed(2)} EUR</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          ))}
        </Stack>
      ) : null}
      <form method="post" encType="multipart/form-data">
        <Stack gap="5">
          <input type="hidden" name="invoiceCount" value={invoiceRows.length} />
          {invoiceRows.map((rowId, index) => (
            <Box key={rowId} borderWidth="1px" borderColor="gray.200" borderRadius="md" p="4">
              <Stack gap="4">
                <Text fontWeight="600">Facture {index + 1}</Text>
                <Field.Root required>
                  <Field.Label>PDF officiel et CSV détail frais</Field.Label>
                  <FileUpload.Root
                    name={`invoiceFiles_${index}`}
                    accept={{
                      "application/pdf": [".pdf"],
                      "text/csv": [".csv"],
                    }}
                    maxFiles={2}
                    width="100%"
                  >
                    <FileUpload.HiddenInput />
                    <FileUpload.Dropzone
                      width="100%"
                      minH="32"
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="md"
                      p="5"
                    >
                      <FileUpload.DropzoneContent>
                        <Text fontWeight="600">Déposez le PDF et le CSV ici</Text>
                        <Text color="gray.600" textStyle="sm">
                          ou sélectionnez les deux fichiers
                        </Text>
                      </FileUpload.DropzoneContent>
                    </FileUpload.Dropzone>
                    <Box
                      width="100%"
                      css={{
                        "& [data-part='item-group']": {
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                          gap: "var(--chakra-spacing-3)",
                        },
                      }}
                    >
                      <FileUpload.List showSize clearable />
                    </Box>
                  </FileUpload.Root>
                  <Field.HelperText>Les deux fichiers sont obligatoires.</Field.HelperText>
                </Field.Root>
                {invoiceRows.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    alignSelf="flex-start"
                    onClick={() => setInvoiceRows((rows) => rows.filter((id) => id !== rowId))}
                  >
                    Retirer cette facture
                  </Button>
                ) : null}
              </Stack>
            </Box>
          ))}
          <Box display="flex" gap="3" flexWrap="wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInvoiceRows((rows) => [...rows, Math.max(...rows, 0) + 1])}
            >
              Ajouter une facture
            </Button>
            <Button type="submit" colorPalette="brand">
              Calculer les frais
            </Button>
          </Box>
        </Stack>
      </form>
    </Stack>
  );
}
