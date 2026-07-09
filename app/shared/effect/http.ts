import { Effect } from 'effect';
import { apiFailure, apiSuccess } from '~/shared/errors/api';
import { toUnknownErrorMessage, type ViewMessage } from '~/shared/errors/messages';

export type ProgramResult<A> = {
  readonly data: A;
  readonly messages: readonly ViewMessage[];
};

export const runApi = async <A, E>(
  program: Effect.Effect<ProgramResult<A>, E, never>,
  mapError: (error: E) => readonly ViewMessage[],
): Promise<Response> => {
  const response = program.pipe(
    Effect.match({
      onFailure: (cause) => apiFailure(400, mapError(cause)),
      onSuccess: (result) => apiSuccess(result.data, result.messages),
    }),
  );

  return Effect.runPromise(response);
};

export const runApiUnknown = async <A>(program: Effect.Effect<ProgramResult<A>, unknown, never>): Promise<Response> => {
  const response = program.pipe(
    Effect.match({
      onFailure: (cause) => apiFailure(500, [toUnknownErrorMessage(cause)]),
      onSuccess: (result) => apiSuccess(result.data, result.messages),
    }),
  );

  return Effect.runPromise(response);
};
