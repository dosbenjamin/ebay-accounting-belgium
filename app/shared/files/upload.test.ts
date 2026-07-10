import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { maxCsvFileBytes, validateFileCount, validateFileSize } from './upload';

describe('upload validation', () => {
  it('rejects too many files with a user-facing message', async () => {
    const result = await Effect.runPromise(
      Effect.flip(validateFileCount([file('a.csv'), file('b.csv')], 1, 'CSV')),
    );

    expect(result.message).toContain('sélectionnez au maximum 1 fichiers');
  });

  it('rejects files over the configured CSV limit', async () => {
    const result = await Effect.runPromise(
      Effect.flip(
        validateFileSize(file('ventes.csv', maxCsvFileBytes + 1), maxCsvFileBytes, 'CSV ventes'),
      ),
    );

    expect(result.message).toContain('dépasse la taille maximale');
  });
});

const file = (name: string, size = 1): File =>
  new File([new Uint8Array(size)], name, { type: 'text/csv' });
