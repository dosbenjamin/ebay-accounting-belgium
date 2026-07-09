import { error, success, type ViewMessage } from '~/shared/errors/messages';
import type { EbayFeesError } from './errors';

export const ebayFeesErrorMessages = (errorValue: EbayFeesError): readonly ViewMessage[] => {
  switch (errorValue._tag) {
    case 'MissingExchangeRateError':
      return [
        error(
          'missing-exchange-rate',
          `Le taux EUR manque pour ${errorValue.currency} dans la facture ${errorValue.invoiceId}. Ajoutez un taux manuel.`,
          { invoiceId: errorValue.invoiceId, currency: errorValue.currency },
        ),
      ];
    case 'FeeMappingError':
      return [
        error(
          'fee-mapping',
          `La colonne "${errorValue.column}" est introuvable dans ${errorValue.fileName}. Corrigez le mapping des frais.`,
          { fileName: errorValue.fileName, column: errorValue.column },
        ),
      ];
    case 'FeePreviewError':
      return [error('fee-preview', errorValue.message)];
  }
};

export const feePreviewSuccess = (invoiceId: string, totalEur: number): readonly ViewMessage[] => [
  success('fee-preview-ok', `Facture ${invoiceId}: total comptable detecte ${totalEur.toFixed(2)} EUR.`),
];
