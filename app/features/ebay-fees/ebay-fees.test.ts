import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { CsvParserLive } from '~/shared/csv/service';
import { previewFeeInvoice } from './service';

describe('ebay fees', () => {
  it('uses CSV EUR amount first', async () => {
    const result = await Effect.runPromise(
      previewFeeInvoice({
        invoiceId: 'fee-1',
        month: 'janvier',
        year: 2026,
        originalPdfFileName: 'invoice.pdf',
        csvFileName: 'fees.csv',
        csvText: 'Devise,Montant,EUR\nUSD,10,9\nUSD,5,4.5',
        mapping: { currency: 'Devise', amount: 'Montant', eurAmount: 'EUR' },
        manualRates: [{ currency: 'USD', rateToEur: 0.1 }],
      }).pipe(Effect.provide(CsvParserLive)),
    );

    expect(result.data.totalEur).toBe(13.5);
    expect(result.data.totalsByCurrency[0]?.rateSource).toBe('csv_eur_amount');
  });

  it('uses manual rate when CSV EUR amount is absent', async () => {
    const result = await Effect.runPromise(
      previewFeeInvoice({
        invoiceId: 'fee-2',
        month: 'fevrier',
        year: 2026,
        originalPdfFileName: 'invoice.pdf',
        csvFileName: 'fees.csv',
        csvText: 'Devise,Montant\nUSD,10\nUSD,5',
        mapping: { currency: 'Devise', amount: 'Montant' },
        manualRates: [{ currency: 'USD', rateToEur: 0.9 }],
      }).pipe(Effect.provide(CsvParserLive)),
    );

    expect(result.data.totalEur).toBe(13.5);
    expect(result.data.totalsByCurrency[0]?.rateSource).toBe('manual_rate');
  });
});
