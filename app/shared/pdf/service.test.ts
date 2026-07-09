import { Effect } from 'effect';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { PdfService, PdfServiceLive } from './service';

describe('pdf service', () => {
  it('creates a summary page followed by paginated detail pages with eBay headers', async () => {
    const bytes = await Effect.runPromise(
      Effect.gen(function* () {
        const pdf = yield* PdfService;
        return yield* pdf.summaryWithDetailsPdf({
          title: 'Ventes trimestrielles eBay',
          lines: ['Total ventes: 100.00 EUR'],
          summaryTable: [
            ['Zone / pays', 'Lignes', 'Total EUR'],
            ['BE', '1', '100.00'],
          ],
          detailsTitle: 'Détail des ventes',
          detailsTable: [
            ['Date', 'Numéro de commande', 'Pays de livraison', 'Montant net'],
            ...Array.from({ length: 80 }, (_, index) => [
              '30 juin 2026',
              `18-14823-${String(index).padStart(5, '0')}`,
              'BE',
              '116243686154',
            ]),
          ],
        });
      }).pipe(Effect.provide(PdfServiceLive)),
    );

    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(2);
  });

  it('starts each detail section on a new page', async () => {
    const bytes = await Effect.runPromise(
      Effect.gen(function* () {
        const pdf = yield* PdfService;
        return yield* pdf.summaryWithDetailSectionsPdf({
          title: 'Ventes et remboursements eBay',
          lines: ['Total net: 75.00 EUR'],
          summaryTable: [['Pays', 'Zone', 'Ventes EUR', 'Remboursements EUR', 'Total net EUR']],
          sections: [
            {
              title: 'Détail des ventes',
              table: [['Date', 'Commande', 'Pays', 'Objet'], ['2026-01-01', 'A', 'BE', '1']],
            },
            {
              title: 'Détail des remboursements',
              table: [['Date', 'Commande', 'Pays', 'Objet'], ['2026-01-02', 'B', 'BE', '2']],
            },
          ],
        });
      }).pipe(Effect.provide(PdfServiceLive)),
    );

    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(3);
  });
});
