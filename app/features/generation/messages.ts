import { ebayFeesErrorMessages } from "~/features/ebay-fees/messages";
import { salesErrorMessages } from "~/features/sales/messages";
import { error, success, type ViewMessage } from "~/shared/errors/messages";
import type { GenerationError } from "./errors";

export const generationErrorMessages = (errorValue: GenerationError): readonly ViewMessage[] => {
  switch (errorValue._tag) {
    case "ColumnMappingError":
    case "DocumentPreviewError":
      return salesErrorMessages(errorValue);
    case "MissingExchangeRateError":
    case "FeeMappingError":
    case "FeePreviewError":
    case "ExchangeRateLookupError":
      return ebayFeesErrorMessages(errorValue);
    case "PdfGenerationError":
      return [error("pdf-generation", errorValue.message, { fileName: errorValue.fileName })];
    case "ZipGenerationError":
      return [error("zip-generation", errorValue.message)];
    case "MissingOriginalPdfError":
      return [
        error(
          "missing-original-pdf",
          `Le PDF officiel manque pour la facture ${errorValue.invoiceId}. Ajoutez le PDF original eBay.`,
          { invoiceId: errorValue.invoiceId },
        ),
      ];
  }
};

export const generationSuccess = (manifestCount: number): readonly ViewMessage[] => [
  success("generation-ok", `Dossier comptable généré avec ${manifestCount} fichiers.`),
];
