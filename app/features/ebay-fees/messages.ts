import { Match } from 'effect';
import { error, type ViewMessage } from '~/shared/errors/messages';
import type { EbayFeesError } from './errors';

export const ebayFeesErrorMessages = (errorValue: EbayFeesError): readonly ViewMessage[] =>
  Match.value(errorValue).pipe(
    Match.tag('MissingExchangeRateError', (value) => [
      error(
        'missing-exchange-rate',
        `Le taux BCE EUR manque pour ${value.currency} dans la facture ${value.invoiceId}. Vérifiez la devise ou ajoutez un montant EUR dans le CSV.`,
        { invoiceId: value.invoiceId, currency: value.currency },
      ),
    ]),
    Match.tag('FeeMappingError', (value) => [
      error(
        'fee-mapping',
        `La colonne "${value.column}" est introuvable dans ${value.fileName}. Corrigez le mapping des frais.`,
        { fileName: value.fileName, column: value.column },
      ),
    ]),
    Match.tag('FeePreviewError', (value) => [error('fee-preview', value.message)]),
    Match.tag('ExchangeRateLookupError', (value) => [
      error('exchange-rate-lookup', value.message, { currency: value.currency }),
    ]),
    Match.exhaustive,
  );
