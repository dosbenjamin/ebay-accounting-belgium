import { Context, Data, Effect, Layer } from 'effect';
import Papa from 'papaparse';

export type CsvPreview = {
  readonly columns: readonly string[];
  readonly rows: readonly Record<string, string>[];
  readonly previewRows: readonly Record<string, string>[];
  readonly rowCount: number;
};

export class CsvParseError extends Data.TaggedError('CsvParseError')<{
  readonly fileName?: string;
  readonly message: string;
}> {}

export class CsvParser extends Context.Tag('CsvParser')<
  CsvParser,
  {
    readonly parse: (input: string, fileName?: string) => Effect.Effect<CsvPreview, CsvParseError>;
  }
>() {}

const normalizeCell = (value: unknown): string => String(value ?? '').trim();

const normalizeHeaderKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

const ebayTransactionHeaderColumns = new Set([
  'date de creation de la transaction',
  'numero de commande',
  'pays de livraison',
  'montant net',
]);

const uniqueNonEmptyCount = (row: readonly string[]): number => new Set(row.filter((cell) => cell !== '')).size;

const ebayTransactionHeaderScore = (row: readonly string[]): number =>
  row.reduce((score, cell) => score + (ebayTransactionHeaderColumns.has(normalizeHeaderKey(cell)) ? 1 : 0), 0);

const findEbayTransactionHeaderIndex = (rows: readonly (readonly string[])[]): number =>
  rows.findIndex((row) => ebayTransactionHeaderScore(row) >= 3);

const hasSameShapeDataRow = (rows: readonly (readonly string[])[], headerIndex: number): boolean => {
  const headerLength = rows[headerIndex]?.length ?? 0;
  const nextRow = rows.slice(headerIndex + 1).find((row) => row.some((cell) => cell !== ''));
  return Boolean(nextRow && nextRow.length >= Math.max(2, Math.floor(headerLength * 0.6)));
};

const isHeaderCandidate = (rows: readonly (readonly string[])[], index: number): boolean => {
  const row = rows[index] ?? [];
  const uniqueCells = uniqueNonEmptyCount(row);
  return (
    row.length >= 2 &&
    uniqueCells >= 2 &&
    uniqueCells === row.filter((cell) => cell !== '').length &&
    hasSameShapeDataRow(rows, index)
  );
};

const findHeaderIndex = (rows: readonly (readonly string[])[]): number => {
  const ebayHeaderIndex = findEbayTransactionHeaderIndex(rows);
  return ebayHeaderIndex >= 0 ? ebayHeaderIndex : rows.findIndex((_, index) => isHeaderCandidate(rows, index));
};

export const CsvParserLive = Layer.succeed(CsvParser, {
  parse: (input, fileName) =>
    Effect.try({
      try: () => {
        const parsed = Papa.parse<string[]>(input, {
          header: false,
          skipEmptyLines: true,
        });
        if (parsed.errors.length > 0) {
          const first = parsed.errors[0];
          throw new CsvParseError({
            ...(fileName ? { fileName } : {}),
            message: first?.message ?? 'CSV invalide',
          });
        }
        const rawRows = parsed.data.map((row) => row.map(normalizeCell));
        const headerIndex = findHeaderIndex(rawRows);
        if (headerIndex < 0) {
          throw new CsvParseError({
            ...(fileName ? { fileName } : {}),
            message: "Aucune ligne d'en-tetes CSV exploitable.",
          });
        }
        const columns = rawRows[headerIndex] ?? [];
        const rows = rawRows
          .slice(headerIndex + 1)
          .map((row) => Object.fromEntries(columns.map((column, index) => [column, normalizeCell(row[index])])));
        return {
          columns,
          rows,
          previewRows: rows.slice(0, 10),
          rowCount: rows.length,
        };
      },
      catch: (cause) =>
        cause instanceof CsvParseError
          ? cause
          : new CsvParseError({
              ...(fileName ? { fileName } : {}),
              message: 'Impossible de lire le CSV.',
            }),
    }),
});
