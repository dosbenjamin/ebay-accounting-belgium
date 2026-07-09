import { Effect } from 'effect';
import { ebayFeesErrorMessages } from '~/features/ebay-fees/messages';
import { FeeInvoiceInput } from '~/features/ebay-fees/schemas';
import { previewFeeInvoice } from '~/features/ebay-fees/service';
import { LiveWorkerLayer } from '~/shared/effect/layers.server';
import { readJson, type InputValidationError } from '~/shared/effect/validation';
import { apiFailure, apiSuccess } from '~/shared/errors/api';
import type { ViewMessage } from '~/shared/errors/messages';
import { validationErrorMessages } from '~/shared/errors/validation';

export const action = async ({ request }: { request: Request }) => {
  const toMessages = (
    cause: InputValidationError | Parameters<typeof ebayFeesErrorMessages>[0],
  ): readonly ViewMessage[] =>
    cause._tag === 'InputValidationError' ? validationErrorMessages(cause) : ebayFeesErrorMessages(cause);

  const program = readJson(request, FeeInvoiceInput).pipe(
    Effect.flatMap((input) => previewFeeInvoice(input)),
    Effect.provide(LiveWorkerLayer),
    Effect.match({
      onFailure: (cause) => apiFailure(400, toMessages(cause)),
      onSuccess: (result) => apiSuccess(result.data, result.messages),
    }),
  );

  return Effect.runPromise(program);
};
