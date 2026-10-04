import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { salesRefundsSummaryTable, salesSummaryTable } from './service';
import { ebayFeesPdfName } from '~/shared/files/names';

describe('generation manifest naming', () => {
  it('keeps each fee invoice as a separate PDF name', () => {
    expect(ebayFeesPdfName('avril')).toBe('avril_frais_ebay_avec_annexe_eur.pdf');
  });

  it('can create a minimal original PDF fixture', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = await pdf.save();
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it('lists every EU country in the sales summary with EUR amounts', () => {
    const table = salesSummaryTable({
      data: {
        kind: 'sales',
        totalRows: 1,
        totalEur: 10,
        euTotal: 10,
        nonEuTotal: 0,
        unknownTotal: 0,
        outputRows: [],
        byCountry: [{ country: 'BE', zone: 'EU', count: 1, totalEur: 10 }],
      },
    });

    expect(table).toContainEqual(['Belgique', '1', '10.00 EUR']);
    expect(table).toContainEqual(['France', '0', '0.00 EUR']);
    expect(table[1]).toEqual(['Hors UE (TVA non applicable)', '0', '0.00 EUR']);
    expect(table).toContainEqual(['Total ventes', '1', '10.00 EUR']);
  });

  it('builds the combined sales refunds net summary by country and zone', () => {
    const table = salesRefundsSummaryTable({
      sales: {
        kind: 'sales',
        totalRows: 2,
        totalEur: 100,
        euTotal: 70,
        nonEuTotal: 30,
        unknownTotal: 0,
        outputRows: [],
        byCountry: [
          { country: 'BE', zone: 'EU', count: 1, totalEur: 70 },
          { country: 'US', zone: 'NON_EU', count: 1, totalEur: 30 },
        ],
      },
      refunds: {
        kind: 'refunds',
        totalRows: 2,
        totalEur: -25,
        euTotal: -10,
        nonEuTotal: -15,
        unknownTotal: 0,
        outputRows: [],
        byCountry: [
          { country: 'BE', zone: 'EU', count: 1, totalEur: -10 },
          { country: 'US', zone: 'NON_EU', count: 1, totalEur: -15 },
        ],
      },
    });

    expect(table).toContainEqual(['Belgique', 'UE', '70.00 EUR', '10.00 EUR', '60.00 EUR']);
    expect(table).toContainEqual(['France', 'UE', '0.00 EUR', '0.00 EUR', '0.00 EUR']);
    expect(table[1]).toEqual([
      'Hors UE',
      '(TVA non applicable)',
      '30.00 EUR',
      '15.00 EUR',
      '15.00 EUR',
    ]);
    expect(table).toContainEqual([
      'Total net',
      'Toutes zones',
      '100.00 EUR',
      '25.00 EUR',
      '75.00 EUR',
    ]);
  });
});
