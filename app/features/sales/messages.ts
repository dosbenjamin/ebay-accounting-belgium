import { Match } from 'effect';
import { error, type ViewMessage } from '~/shared/errors/messages';
import type { SalesError } from './errors';

export const salesErrorMessages = (errorValue: SalesError): readonly ViewMessage[] =>
  Match.value(errorValue).pipe(
    Match.tag('ColumnMappingError', (value) => [
      error(
        'sales-mapping',
        `La colonne "${value.column}" est introuvable dans ${value.fileName}. Corrigez le mapping.`,
        { fileName: value.fileName, column: value.column },
      ),
    ]),
    Match.tag('DocumentPreviewError', (value) => [error('sales-preview', value.message)]),
    Match.exhaustive,
  );
