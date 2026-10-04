import { Effect, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import { CsvParserLive } from '~/shared/csv/service';
import { ExchangeRateProvider } from '~/shared/exchange-rates/service';
import { ebayInvoiceFeeCsvMapping } from './schemas';
import { inferEbayInvoicePeriod, previewFeeInvoice } from './service';

const ExchangeRateProviderTest = Layer.succeed(ExchangeRateProvider, {
  rateToEur: (currency) =>
    Effect.succeed(
      {
        AUD: 0.6,
        CAD: 0.67,
        EUR: 1,
        GBP: 1.17,
        USD: 0.92,
      }[currency.toUpperCase()] ?? 1,
    ),
});

const TestLayer = Layer.mergeAll(CsvParserLive, ExchangeRateProviderTest);

describe('ebay fees', () => {
  it('infers the invoice period from the eBay CSV metadata', async () => {
    const result = await Effect.runPromise(
      inferEbayInvoicePeriod(
        [
          'Date de facturation : 30 juin 2026',
          'Pseudo du vendeur eBay : voxparts',
          'Période : du 01 juin 2026 PDT au 30 juin 2026 PDT',
          'Date,Devise,Montant total',
          '01 juin 2026 05:29:07 PDT,GBP,"4,79"',
        ].join('\n'),
        'fees.csv',
      ),
    );

    expect(result).toEqual({ month: 'juin', year: 2026 });
  });

  it('infers the period from the abbreviated eBay month format', async () => {
    const result = await Effect.runPromise(
      inferEbayInvoicePeriod(
        [
          'Date de facturation : 30 sept. 2026',
          'Pseudo du vendeur eBay : voxparts',
          'Période : 01 sept. 2026 au 30 sept. 2026',
          'Date,Devise,Montant total',
          '01 sept. 2026 05:29:07,EUR,"4,79"',
        ].join('\n'),
        'fees.csv',
      ),
    );

    expect(result).toEqual({ month: 'septembre', year: 2026 });
  });

  it('normalizes an abbreviated English month used by eBay', async () => {
    const result = await Effect.runPromise(
      inferEbayInvoicePeriod(
        [
          'Date de facturation : 31 Aug 2026',
          'Période : du 01 Aug 2026 PDT au 31 Aug 2026 PDT',
          'Date,Devise,Montant total',
        ].join('\n'),
        'fees.csv',
      ),
    );

    expect(result).toEqual({ month: 'août', year: 2026 });
  });

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
      }).pipe(Effect.provide(TestLayer)),
    );

    expect(result.totalEur).toBe(13.5);
    expect(result.totalsByCurrency[0]?.rateSource).toBe('csv_eur_amount');
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
      }).pipe(Effect.provide(TestLayer)),
    );

    expect(result.totalEur).toBe(13.5);
    expect(result.totalsByCurrency[0]?.rateSource).toBe('manual_rate');
  });

  it('uses the fixed eBay invoice CSV columns and live rates for every invoice currency', async () => {
    const csvText = [
      'Date de facturation : 30 juin 2026',
      'Pseudo du vendeur eBay : voxparts',
      'Nom du rapport : Détails de la facture fiscale',
      'Période : du 01 juin 2026 PDT au 30 juin 2026 PDT',
      "Date,Description,Mémo,Numéro de commande,Numéro de l'objet,Catégorie de frais,Type de frais,Devise,Montant net,TVA (%),Montant de TVA,Montant total,Facturé par l'entité",
      '01 juin 2026 05:29:07 PDT,Article,"Montant final : 40,00 GBP",01-1,127,Commissions,Commission,GBP,"3,96","21,00%","0,83","4,79",PLACE DE MARCHÉ',
      '01 juin 2026 08:00:22 PDT,Article,"Montant final : 59,98 USD",03-1,117,Commissions,Commission,USD,"5,61","21,00%","1,18","6,79",PLACE DE MARCHÉ',
      '01 juin 2026 10:50:00 PDT,-,01 juin - 30 juin,-,-,Frais d\'inscription,Boutique,EUR,"39,50","21,00%","8,30","47,80",PLACE DE MARCHÉ',
      '02 juin 2026 05:57:43 PDT,Article,"Montant final : 640,12 CAD",10-1,116,Commissions,Commission,CAD,"59,85","21,00%","12,57","72,42",PLACE DE MARCHÉ',
      '03 juin 2026 05:57:43 PDT,Article,"Montant final : 100,00 AUD",11-1,118,Commissions,Commission,AUD,"9,00","21,00%","1,89","10,89",PLACE DE MARCHÉ',
    ].join('\n');

    const result = await Effect.runPromise(
      previewFeeInvoice({
        invoiceId: '326781480',
        month: 'juin',
        year: 2026,
        originalPdfFileName: 'invoice.pdf',
        csvFileName: 'invoiceId-326781480_2026-6 (3).csv',
        csvText,
        mapping: ebayInvoiceFeeCsvMapping,
        manualRates: [],
      }).pipe(Effect.provide(TestLayer)),
    );

    expect(result.totalEur).toBeGreaterThan(0);
    expect(result.totalsByCurrency.map((row) => row.currency).toSorted()).toEqual([
      'AUD',
      'CAD',
      'EUR',
      'GBP',
      'USD',
    ]);
    expect(result.totalsByCurrency.find((row) => row.currency === 'GBP')?.rateSource).toBe(
      'live_ecb',
    );
    expect(result.totalsByCurrency.find((row) => row.currency === 'EUR')?.rateToEur).toBe(1);
  });
});
