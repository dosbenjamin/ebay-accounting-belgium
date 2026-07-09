import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
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
});
