import { Effect } from "effect";
import { generationErrorMessages } from "~/features/generation/messages";
import { generatePackageFromUploadForm, zipResponse } from "~/features/generation/form-upload";
import { LiveWorkerLayer } from "~/shared/effect/layers.server";
import { readFormData, type InputValidationError } from "~/shared/effect/validation";
import { apiFailure } from "~/shared/errors/api";
import type { ViewMessage } from "~/shared/errors/messages";
import { validationErrorMessages } from "~/shared/errors/validation";

export const action = async ({ request }: { request: Request }) => {
  const toMessages = (
    cause: InputValidationError | Parameters<typeof generationErrorMessages>[0],
  ): readonly ViewMessage[] =>
    cause._tag === "InputValidationError"
      ? validationErrorMessages(cause)
      : generationErrorMessages(cause);

  const program = readFormData(request).pipe(
    Effect.flatMap((formData) => generatePackageFromUploadForm(formData)),
    Effect.provide(LiveWorkerLayer),
    Effect.match({
      onFailure: (cause) => apiFailure(400, toMessages(cause)),
      onSuccess: (result) => zipResponse(result.data.bytes, result.data.fileName),
    }),
  );

  return Effect.runPromise(program);
};
