import { Box, Button, Field, FileUpload, Grid, Heading, Stack, Text } from "@chakra-ui/react";
import { useState, type FormEvent } from "react";
import { MessageList } from "~/shared/ui/messages";
import type { ViewMessage } from "~/shared/errors/messages";

type Props = {
  readonly title: string;
  readonly description: string;
  readonly documentType: 'sales' | 'refunds';
  readonly messages?: readonly ViewMessage[] | undefined;
  readonly summary?:
    | {
        readonly totalRows: number;
        readonly totalEur: number;
        readonly euTotal: number;
        readonly nonEuTotal: number;
      }
    | undefined;
};

export function DocumentUploadPanel({ title, description, documentType, messages = [], summary }: Props) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfMessages, setPdfMessages] = useState<readonly ViewMessage[]>([]);
  void summary;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsGeneratingPdf(true);
    setPdfMessages([]);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("intent", "pdf");
      const response = await fetch(`/api/document-pdf?documentType=${documentType}`, { method: "POST", body: formData });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.includes("application/pdf")) {
        const payload = contentType.includes("application/json") ? await response.json() : undefined;
        const responseMessages =
          payload && typeof payload === "object" && "messages" in payload && Array.isArray(payload.messages)
            ? (payload.messages as readonly ViewMessage[])
            : undefined;
        setPdfMessages(
          responseMessages ?? [
            {
              id: "pdf-generation-client",
              severity: "error",
              text: "Le PDF n'a pas pu etre genere. Verifiez le fichier CSV puis reessayez.",
            },
          ],
        );
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileNameFromDisposition(response.headers.get("content-disposition")) ?? "document_etape.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setPdfMessages([
        {
          id: "pdf-generation-network",
          severity: "error",
          text: "Le PDF n'a pas pu etre genere. Verifiez le fichier CSV puis reessayez.",
        },
      ]);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Box>
      <Stack gap="5">
        <Box>
          <Heading size="lg">{title}</Heading>
          <Text color="gray.600">{description}</Text>
        </Box>
        <MessageList messages={[...messages, ...pdfMessages]} />
        <form method="post" encType="multipart/form-data" onSubmit={handleSubmit}>
          <Stack gap="5">
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
              <Field.Root>
                <Field.Label>{documentType === "sales" ? "CSV ventes eBay" : "CSV remboursements eBay"}</Field.Label>
                <FileUpload.Root
                  name="documentCsv"
                  accept={{ "text/csv": [".csv"] }}
                  maxFiles={Number.MAX_SAFE_INTEGER}
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
                      <Text fontWeight="600">Deposez les CSV ici</Text>
                      <Text color="gray.600" textStyle="sm">
                        ou selectionnez un ou plusieurs fichiers
                      </Text>
                    </FileUpload.DropzoneContent>
                  </FileUpload.Dropzone>
                  <FileUpload.List showSize clearable />
                </FileUpload.Root>
                <Field.HelperText>
                  Vous pouvez selectionner plusieurs fichiers CSV.
                </Field.HelperText>
              </Field.Root>
              {documentType === "sales" ? (
                <Field.Root>
                  <Field.Label>CSV remboursements eBay</Field.Label>
                  <FileUpload.Root
                    name="refundCsv"
                    accept={{ "text/csv": [".csv"] }}
                    maxFiles={Number.MAX_SAFE_INTEGER}
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
                        <Text fontWeight="600">Deposez les CSV ici</Text>
                        <Text color="gray.600" textStyle="sm">
                          ou selectionnez un ou plusieurs fichiers
                        </Text>
                      </FileUpload.DropzoneContent>
                    </FileUpload.Dropzone>
                    <FileUpload.List showSize clearable />
                  </FileUpload.Root>
                  <Field.HelperText>Si aucun fichier n'est ajoute, les remboursements restent a zero.</Field.HelperText>
                </Field.Root>
              ) : null}
            </Grid>
            <Button type="submit" colorPalette="brand" alignSelf="flex-start" disabled={isGeneratingPdf}>
              {isGeneratingPdf ? "Analyse et generation..." : "Analyser et generer le PDF"}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
}

const fileNameFromDisposition = (disposition: string | null): string | undefined => {
  const match = disposition?.match(/filename="?(?<fileName>[^";]+)"?/);
  return match?.groups?.fileName;
};
