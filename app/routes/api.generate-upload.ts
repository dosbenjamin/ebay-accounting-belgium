import { Effect } from 'effect';
import { generationErrorMessages } from '~/features/generation/messages';
import { generatePackageFromUploadForm, zipResponse } from '~/features/generation/form-upload';
import { LiveWorkerLayer } from '~/shared/effect/layers.server';
import { readFormData } from '~/shared/effect/validation';
import { apiFailure } from '~/shared/errors/api';
import { validationErrorMessages } from '~/shared/errors/validation';

export const action = async ({ request }: { request: Request }) => {
  const program = readFormData(request).pipe(
    Effect.flatMap((formData) => generatePackageFromUploadForm(formData)),
    Effect.provide(LiveWorkerLayer),
    Effect.map((result) => zipResponse(result.data.bytes, result.data.fileName)),
    Effect.catchTag('InputValidationError', (cause) =>
      Effect.succeed(apiFailure(400, validationErrorMessages(cause))),
    ),
    Effect.catchAll((cause) => Effect.succeed(apiFailure(400, generationErrorMessages(cause)))),
  );

  return Effect.runPromise(program);
};
