import { Effect } from 'effect';
import { CsvParser } from '~/shared/csv/service';
import { LiveWorkerLayer } from '~/shared/effect/layers.server';
import { InputValidationError, readFormData, readQuery } from '~/shared/effect/validation';
import { apiFailure, apiSuccess } from '~/shared/errors/api';
import { error, success } from '~/shared/errors/messages';
import { validationErrorMessages } from '~/shared/errors/validation';
import { CsvPreviewQuery } from './schemas';

export const action = async ({ request }: { request: Request }) => {
  const program = Effect.gen(function* () {
    yield* readQuery(request, CsvPreviewQuery);
    const formData = yield* readFormData(request);
    const file = formData.get('csv');
    if (!(file instanceof File)) {
      return yield* Effect.fail(
        new InputValidationError({
          scope: 'form',
          message: 'Fichier CSV manquant.',
        }),
      );
    }
    const parser = yield* CsvParser;
    const text = yield* Effect.promise(() => file.text());
    const preview = yield* parser.parse(text, file.name);
    return { preview, fileName: file.name };
  }).pipe(
    Effect.provide(LiveWorkerLayer),
    Effect.match({
      onFailure: (cause) => {
        switch (cause._tag) {
          case 'InputValidationError':
            return apiFailure(400, validationErrorMessages(cause));
          case 'CsvParseError':
            return apiFailure(400, [
              error(
                'csv-preview-failed',
                `Impossible de lire ${cause.fileName ?? 'le fichier CSV'}. Vérifiez le format CSV.`,
              ),
            ]);
        }
      },
      onSuccess: ({ preview, fileName }) =>
        apiSuccess(
          {
            ...preview,
            rows: preview.previewRows,
          },
          [success('csv-preview-ok', `${fileName}: ${preview.rowCount} lignes détectées.`)],
        ),
    }),
  );

  return Effect.runPromise(program);
};
