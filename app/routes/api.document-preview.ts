import { Effect } from 'effect';
import { previewDocument } from '~/features/sales/service';
import { DocumentPreviewInput } from '~/features/sales/schemas';
import { salesErrorMessages } from '~/features/sales/messages';
import { LiveWorkerLayer } from '~/shared/effect/layers.server';
import { readJson, type InputValidationError } from '~/shared/effect/validation';
import { apiFailure, apiSuccess } from '~/shared/errors/api';
import type { ViewMessage } from '~/shared/errors/messages';
import { validationErrorMessages } from '~/shared/errors/validation';

export const action = async ({ request }: { request: Request }) => {
  const toMessages = (cause: InputValidationError | Parameters<typeof salesErrorMessages>[0]): readonly ViewMessage[] =>
    cause._tag === 'InputValidationError' ? validationErrorMessages(cause) : salesErrorMessages(cause);

  const program = readJson(request, DocumentPreviewInput).pipe(
    Effect.flatMap((input) => previewDocument(input)),
    Effect.provide(LiveWorkerLayer),
    Effect.match({
      onFailure: (cause) => apiFailure(400, toMessages(cause)),
      onSuccess: (result) => apiSuccess(result.data, result.messages),
    }),
  );

  return Effect.runPromise(program);
};
