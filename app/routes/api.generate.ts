import { Effect } from 'effect';
import { generationErrorMessages } from '~/features/generation/messages';
import { GeneratePackageInput } from '~/features/generation/schemas';
import { generateQuarterPackage } from '~/features/generation/service';
import { LiveWorkerLayer } from '~/shared/effect/layers.server';
import { readJson, type InputValidationError } from '~/shared/effect/validation';
import { apiFailure } from '~/shared/errors/api';
import type { ViewMessage } from '~/shared/errors/messages';
import { validationErrorMessages } from '~/shared/errors/validation';

export const action = async ({ request }: { request: Request }) => {
  const toMessages = (
    cause: InputValidationError | Parameters<typeof generationErrorMessages>[0],
  ): readonly ViewMessage[] =>
    cause._tag === 'InputValidationError' ? validationErrorMessages(cause) : generationErrorMessages(cause);

  const program = readJson(request, GeneratePackageInput).pipe(
    Effect.flatMap((input) => generateQuarterPackage(input)),
    Effect.provide(LiveWorkerLayer),
    Effect.match({
      onFailure: (cause) => apiFailure(400, toMessages(cause)),
      onSuccess: (result) => {
        const body = new ArrayBuffer(result.data.bytes.byteLength);
        new Uint8Array(body).set(result.data.bytes);
        return new Response(body, {
          headers: {
            'content-type': 'application/zip',
            'content-disposition': `attachment; filename="${result.data.fileName}"`,
            'x-generated-files': result.data.manifest.join(', '),
          },
        });
      },
    }),
  );

  return Effect.runPromise(program);
};
