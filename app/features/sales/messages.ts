import { error, success, warning, type ViewMessage } from '~/shared/errors/messages';
import type { SalesError } from './errors';

export const salesErrorMessages = (errorValue: SalesError): readonly ViewMessage[] => {
  switch (errorValue._tag) {
    case 'ColumnMappingError':
      return [
        error(
          'sales-mapping',
          `La colonne "${errorValue.column}" est introuvable dans ${errorValue.fileName}. Corrigez le mapping.`,
          { fileName: errorValue.fileName, column: errorValue.column },
        ),
      ];
    case 'DocumentPreviewError':
      return [error('sales-preview', errorValue.message)];
  }
};

export const documentPreviewMessages = (
  kind: 'sales' | 'refunds',
  rowCount: number,
  unknownCountryCount: number,
): readonly ViewMessage[] => [
  success(`${kind}-preview-ok`, `${kind === 'sales' ? 'Ventes' : 'Remboursements'}: ${rowCount} lignes analysees.`),
  ...(unknownCountryCount > 0
    ? [
        warning(
          `${kind}-unknown-countries`,
          `${unknownCountryCount} pays n'ont pas ete reconnus. Verifiez la colonne Pays avant generation.`,
        ),
      ]
    : []),
];
