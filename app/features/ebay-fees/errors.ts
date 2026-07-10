import { Data } from 'effect';
import type { ExchangeRateLookupError } from '~/shared/exchange-rates/service';

export class MissingExchangeRateError extends Data.TaggedError('MissingExchangeRateError')<{
  readonly invoiceId: string;
  readonly currency: string;
}> {}

export class FeeMappingError extends Data.TaggedError('FeeMappingError')<{
  readonly fileName: string;
  readonly column: string;
}> {}

export class FeePreviewError extends Data.TaggedError('FeePreviewError')<{
  readonly message: string;
}> {}

export type EbayFeesError =
  | MissingExchangeRateError
  | FeeMappingError
  | FeePreviewError
  | ExchangeRateLookupError;
