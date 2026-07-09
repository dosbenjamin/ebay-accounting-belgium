import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { CsvParser, CsvParserLive } from './service';

const parseCsv = (csvText: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const parser = yield* CsvParser;
      return yield* parser.parse(csvText, 'transactions.csv');
    }).pipe(Effect.provide(CsvParserLive)),
  );

describe('csv parser', () => {
  it('parses a regular CSV whose header is the first row', async () => {
    const preview = await parseCsv('Date,Commande,Pays,Montant\n2026-01-01,A,BE,10');

    expect(preview.columns).toEqual(['Date', 'Commande', 'Pays', 'Montant']);
    expect(preview.rows).toEqual([{ Date: '2026-01-01', Commande: 'A', Pays: 'BE', Montant: '10' }]);
  });

  it('skips the eBay transaction report preamble before the real header', async () => {
    const preview = await parseCsv(
      [
        '--,--,--,--,--',
        '"Remarques"',
        '"Tous les frais affiches incluent les taxes."',
        '',
        '"Rapport sur les transactions"',
        '"Ce rapport inclut le type de transaction","commande "',
        '"Vendeur","voxparts"',
        '"Date de début","01/04/2026 00:00:00 AM CEST"',
        '"Date de creation de la transaction","Type","Numero de commande","Pays de livraison","Montant net"',
        '"30 juin 2026","Commande","18-14823-59179","IL","16,88"',
      ].join('\n'),
    );

    expect(preview.columns).toEqual([
      'Date de creation de la transaction',
      'Type',
      'Numero de commande',
      'Pays de livraison',
      'Montant net',
    ]);
    expect(preview.rows).toEqual([
      {
        'Date de creation de la transaction': '30 juin 2026',
        Type: 'Commande',
        'Numero de commande': '18-14823-59179',
        'Pays de livraison': 'IL',
        'Montant net': '16,88',
      },
    ]);
  });
});
