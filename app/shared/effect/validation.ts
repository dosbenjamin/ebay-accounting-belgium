import { Data, Effect, Schema } from 'effect';

export class InputValidationError extends Data.TaggedError('InputValidationError')<{
  readonly scope: 'query' | 'params' | 'json' | 'form';
  readonly message: string;
}> {}

export const decodeUnknown = Effect.fn('validation.decodeUnknown')(
  <A, I>(
    schema: Schema.Schema<A, I, never>,
    input: unknown,
    scope: InputValidationError['scope'],
  ): Effect.Effect<A, InputValidationError> =>
    Effect.annotateCurrentSpan('validation.scope', scope).pipe(
      Effect.zipRight(
        Schema.decodeUnknown(schema)(input).pipe(
          Effect.mapError(
            () =>
              new InputValidationError({
                scope,
                message: `Validation ${scope} invalide.`,
              }),
          ),
        ),
      ),
    ),
);

export const readJson = Effect.fn('validation.readJson')(
  <A, I>(
    request: Request,
    schema: Schema.Schema<A, I, never>,
  ): Effect.Effect<A, InputValidationError> =>
    Effect.tryPromise({
      try: () => request.json(),
      catch: () =>
        new InputValidationError({
          scope: 'json',
          message: 'Payload JSON invalide.',
        }),
    }).pipe(Effect.flatMap((payload) => decodeUnknown(schema, payload, 'json'))),
);

export const readFormData = Effect.fn('validation.readFormData')(function* (request: Request) {
  return yield* Effect.tryPromise({
    try: () => request.formData(),
    catch: () =>
      new InputValidationError({
        scope: 'form',
        message: 'Formulaire invalide.',
      }),
  });
});

export const readQuery = Effect.fn('validation.readQuery')(
  <A, I>(
    request: Request,
    schema: Schema.Schema<A, I, never>,
  ): Effect.Effect<A, InputValidationError> =>
    Effect.sync(() => {
      const url = new URL(request.url);
      return Object.fromEntries(url.searchParams.entries());
    }).pipe(Effect.flatMap((query) => decodeUnknown(schema, query, 'query'))),
);

export const readFormObject = Effect.fn('validation.readFormObject')(
  <A, I>(
    formData: FormData,
    schema: Schema.Schema<A, I, never>,
  ): Effect.Effect<A, InputValidationError> =>
    Effect.sync(() =>
      Object.fromEntries(
        Array.from(formData.entries()).filter((entry): entry is [string, string] => {
          const [, value] = entry;
          return typeof value === 'string' && value.trim().length > 0;
        }),
      ),
    ).pipe(Effect.flatMap((form) => decodeUnknown(schema, form, 'form'))),
);
