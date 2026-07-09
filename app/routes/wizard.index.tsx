import {
  Box,
  Button,
  Field,
  FileUpload,
  Grid,
  Heading,
  Input,
  Select,
  Stack,
  Text,
  createListCollection,
} from "@chakra-ui/react";
import { Effect } from "effect";
import { useState, type FormEvent } from "react";
import { useActionData } from "react-router";
import { generatePackageFromUploadForm, zipResponse } from "~/features/generation/form-upload";
import { generationErrorMessages } from "~/features/generation/messages";
import { LiveWorkerLayer } from "~/shared/effect/layers.server";
import { readFormData } from "~/shared/effect/validation";
import type { ViewMessage } from "~/shared/errors/messages";
import { validationErrorMessages } from "~/shared/errors/validation";
import { MessageList } from "~/shared/ui/messages";

const quarterCollection = createListCollection({
  items: [
    { label: "T1", value: "T1" },
    { label: "T2", value: "T2" },
    { label: "T3", value: "T3" },
    { label: "T4", value: "T4" },
  ],
});

type ActionData = { readonly ok: false; readonly messages: readonly ViewMessage[] };

const fileNameFromDisposition = (disposition: string | null): string | undefined =>
  disposition?.match(/filename="?(?<fileName>[^";]+)"?/)?.groups?.fileName;

export const loader = async () => ({ step: "index" });

export const action = async ({ request }: { request: Request }): Promise<ActionData | Response> => {
  const program = readFormData(request).pipe(
    Effect.flatMap((formData) => generatePackageFromUploadForm(formData)),
    Effect.provide(LiveWorkerLayer),
    Effect.match({
      onFailure: (cause) => ({
        ok: false as const,
        messages:
          cause._tag === "InputValidationError"
            ? validationErrorMessages(cause)
            : generationErrorMessages(cause),
      }),
      onSuccess: (result) => zipResponse(result.data.bytes, result.data.fileName),
    }),
  );

  return Effect.runPromise(program);
};

export default function WizardIndexRoute() {
  const actionData = useActionData<typeof action>();
  const [invoiceRows, setInvoiceRows] = useState([0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clientMessages, setClientMessages] = useState<readonly ViewMessage[]>([]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsGenerating(true);
    setClientMessages([]);

    try {
      const response = await fetch("/api/generate-upload", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("application/zip")) {
        const payload = contentType.includes("application/json")
          ? await response.json()
          : undefined;
        const messages =
          payload &&
          typeof payload === "object" &&
          "messages" in payload &&
          Array.isArray(payload.messages)
            ? (payload.messages as readonly ViewMessage[])
            : [
                {
                  id: "zip-generation-client",
                  severity: "error" as const,
                  text: "Le ZIP n'a pas pu être généré. Vérifiez les fichiers puis réessayez.",
                },
              ];
        setClientMessages(messages);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        fileNameFromDisposition(response.headers.get("content-disposition")) ??
        "dossier_comptable_ebay.zip";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setClientMessages([
        {
          id: "zip-generation-network",
          severity: "error",
          text: "Le ZIP n'a pas pu être généré. Vérifiez les fichiers puis réessayez.",
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Stack gap="6">
      <Box>
        <Heading size="lg">Dossier comptable eBay</Heading>
        <Text color="gray.600">
          Ajoutez les fichiers du trimestre, puis générez le ZIP comptable final.
        </Text>
      </Box>
      <MessageList
        messages={[
          ...(actionData && "messages" in actionData ? actionData.messages : []),
          ...clientMessages,
        ]}
      />
      <form method="post" action="?index" encType="multipart/form-data" onSubmit={handleSubmit}>
        <Stack gap="6">
          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p="4">
            <Stack gap="4">
              <Heading size="sm">Période</Heading>
              <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap="4">
                <Field.Root required>
                  <Field.Label>Année</Field.Label>
                  <Input name="year" type="number" defaultValue={new Date().getFullYear()} />
                </Field.Root>
                <Field.Root required>
                  <Field.Label>Trimestre</Field.Label>
                  <Select.Root name="quarter" collection={quarterCollection} defaultValue={["T1"]}>
                    <Select.HiddenSelect />
                    <Select.Control>
                      <Select.Trigger>
                        <Select.ValueText placeholder="Sélectionner un trimestre" />
                      </Select.Trigger>
                      <Select.IndicatorGroup>
                        <Select.Indicator />
                      </Select.IndicatorGroup>
                    </Select.Control>
                    <Select.Positioner>
                      <Select.Content>
                        {quarterCollection.items.map((quarter) => (
                          <Select.Item item={quarter} key={quarter.value}>
                            <Select.ItemText>{quarter.label}</Select.ItemText>
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                </Field.Root>
                <Field.Root>
                  <Field.Label>Devise comptable</Field.Label>
                  <Input name="accountingCurrency" value="EUR" readOnly />
                </Field.Root>
              </Grid>
            </Stack>
          </Box>

          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p="4">
            <Stack gap="4">
              <Heading size="sm">Ventes et remboursements</Heading>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
                <UploadField
                  name="salesCsv"
                  label="CSV ventes eBay"
                  dropText="Déposez les CSV ventes ici"
                  helperText="Un ou plusieurs fichiers CSV de ventes."
                  maxFiles={Number.MAX_SAFE_INTEGER}
                />
                <UploadField
                  name="refundCsv"
                  label="CSV remboursements eBay"
                  dropText="Déposez les CSV remboursements ici"
                  helperText="Optionnel: sans fichier, les remboursements restent à zéro."
                  maxFiles={Number.MAX_SAFE_INTEGER}
                />
              </Grid>
            </Stack>
          </Box>

          <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" p="4">
            <Stack gap="4">
              <Heading size="sm">Factures frais eBay</Heading>
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
              <Button
                type="button"
                variant="outline"
                alignSelf="flex-start"
                onClick={() => setInvoiceRows((rows) => [...rows, Math.max(...rows, 0) + 1])}
              >
                Ajouter une facture
              </Button>
            </Stack>
          </Box>

          <Button
            type="submit"
            colorPalette="brand"
            size="lg"
            alignSelf="flex-start"
            disabled={isGenerating}
          >
            {isGenerating ? "Génération du ZIP..." : "Générer le ZIP comptable"}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}

function UploadField(props: {
  readonly name: string;
  readonly label: string;
  readonly dropText: string;
  readonly helperText: string;
  readonly maxFiles: number;
}) {
  return (
    <Field.Root>
      <Field.Label>{props.label}</Field.Label>
      <FileUpload.Root
        name={props.name}
        accept={{ "text/csv": [".csv"] }}
        maxFiles={props.maxFiles}
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
            <Text fontWeight="600">{props.dropText}</Text>
            <Text color="gray.600" textStyle="sm">
              ou sélectionnez un ou plusieurs fichiers
            </Text>
          </FileUpload.DropzoneContent>
        </FileUpload.Dropzone>
        <FileUpload.List showSize clearable />
      </FileUpload.Root>
      <Field.HelperText>{props.helperText}</Field.HelperText>
    </Field.Root>
  );
}
