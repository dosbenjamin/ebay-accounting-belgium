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
          detailsTitle: 'Detail des ventes',
          detailsTable: [
            ['Date de création de la transaction', 'Numéro de commande', 'Pays de livraison', "Numéro de l'objet"],
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
});
