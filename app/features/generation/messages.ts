import { Match } from 'effect';
import { ebayFeesErrorMessages } from '~/features/ebay-fees/messages';
import { salesErrorMessages } from '~/features/sales/messages';
import { error, success, type ViewMessage } from '~/shared/errors/messages';
import type { GenerationError } from './errors';

export const generationErrorMessages = (errorValue: GenerationError): readonly ViewMessage[] =>
  Match.value(errorValue).pipe(
    Match.tagsExhaustive({
      ColumnMappingError: salesErrorMessages,
      DocumentPreviewError: salesErrorMessages,
      MissingExchangeRateError: ebayFeesErrorMessages,
      FeeMappingError: ebayFeesErrorMessages,
      FeePreviewError: ebayFeesErrorMessages,
      ExchangeRateLookupError: ebayFeesErrorMessages,
      PdfGenerationError: (value) => [
        error('pdf-generation', value.message, { fileName: value.fileName }),
      ],
      ZipGenerationError: (value) => [error('zip-generation', value.message)],
      MissingOriginalPdfError: (value) => [
        error(
          'missing-original-pdf',
          `Le PDF officiel manque pour la facture ${value.invoiceId}. Ajoutez le PDF original eBay.`,
          { invoiceId: value.invoiceId },
        ),
      ],
      UploadValidationError: (value) => [
        error('upload-validation', value.message, { fileName: value.fileName }),
      ],
    }),
  );

export const generationSuccess = (manifestCount: number): readonly ViewMessage[] => [
  success('generation-ok', `Dossier comptable généré avec ${manifestCount} fichiers.`),
];
