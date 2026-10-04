import { Effect } from 'effect';
import { previewFeeInvoice } from '~/features/ebay-fees/service';
import { previewDocument } from '~/features/sales/service';
import type { DocumentPreview } from '~/features/sales/schemas';
import { ClockService } from '~/shared/clock/service';
import { countryNameFr, euCountryCodes } from '~/shared/countries/eu';
import { ebayFeesPdfName, salesPdfName } from '~/shared/files/names';
import { formatEur } from '~/shared/money/money';
import { PdfService } from '~/shared/pdf/service';
import { ZipService, type ZipEntry } from '~/shared/zip/service';
import { MissingOriginalPdfError } from './errors';
import { generationSuccess } from './messages';
import type { GeneratePackageInput } from './schemas';

type SalesSummaryInput = {
  readonly data: DocumentPreview;
};

const optionalLine = (line: string | undefined): readonly string[] => {
  if (!line) {
    return [];
  }
  return [line];
};

const monthWithFrenchPreposition = (month: string): string =>
  /^[aeiouyàâäéèêëîïôöùûü]/i.test(month) ? `d'${month}` : `de ${month}`;

export const salesSummaryTable = (sales: SalesSummaryInput) => {
  const byCountry = new Map(sales.data.byCountry.map((row) => [row.country, row]));
  const euRows = euCountryCodes.map((country) => {
    const row = byCountry.get(country);
    return [countryNameFr(country), String(row?.count ?? 0), formatEur(row?.totalEur ?? 0)];
  });
  const nonEuCount = sales.data.byCountry
    .filter((row) => row.zone === 'NON_EU')
    .reduce((sum, row) => sum + row.count, 0);
  const unknownCount = sales.data.byCountry
    .filter((row) => row.zone === 'UNKNOWN')
    .reduce((sum, row) => sum + row.count, 0);

  return [
    ['Zone / pays', 'Lignes', 'Total EUR'],
    ['Hors UE (TVA non applicable)', String(nonEuCount), formatEur(sales.data.nonEuTotal)],
    ...euRows,
    ['Pays non reconnus', String(unknownCount), formatEur(sales.data.unknownTotal)],
    ['Total ventes', String(sales.data.totalRows), formatEur(sales.data.totalEur)],
  ];
};

export const generateSalesPdf = Effect.fn('generation.generateSalesPdf')(function* (input: {
  readonly sales: DocumentPreview;
  readonly periodLine?: string;
  readonly generatedOn: string;
}) {
  yield* Effect.annotateCurrentSpan('sales.rows', input.sales.totalRows);
  const pdf = yield* PdfService;
  return yield* pdf.summaryWithDetailsPdf({
    title: 'Ventes trimestrielles eBay',
    lines: [
      ...optionalLine(input.periodLine),
      `Date de génération: ${input.generatedOn}`,
      `Total ventes: ${formatEur(input.sales.totalEur)}`,
      `Total UE: ${formatEur(input.sales.euTotal)}`,
      `Total hors UE: ${formatEur(input.sales.nonEuTotal)}`,
    ],
    summaryTable: salesSummaryTable({ data: input.sales }),
    detailsTitle: 'Détail des ventes',
    detailsTable: [
      ['Date', 'Numéro de commande', 'Pays de livraison', 'Montant net EUR'],
      ...input.sales.outputRows.map((row) => [
        row.createdAt,
        row.orderNumber,
        row.shippingCountry,
        formatNetAmountEur(row.netAmount),
      ]),
    ],
  });
});

export const generateRefundsPdf = Effect.fn('generation.generateRefundsPdf')(function* (input: {
  readonly refunds: DocumentPreview;
  readonly periodLine?: string;
  readonly generatedOn: string;
}) {
  yield* Effect.annotateCurrentSpan('refund.rows', input.refunds.totalRows);
  const pdf = yield* PdfService;
  return yield* pdf.summaryPdf({
    title: 'Remboursements trimestriels eBay',
    lines: [
      ...optionalLine(input.periodLine),
      `Date de génération: ${input.generatedOn}`,
      `Total remboursements: ${formatEur(input.refunds.totalEur)}`,
      `Total UE: ${formatEur(input.refunds.euTotal)}`,
      `Total hors UE: ${formatEur(input.refunds.nonEuTotal)}`,
    ],
    table: [
      ['Pays', 'Zone', 'Lignes', 'Total EUR'],
      ...input.refunds.byCountry.map((row) => [
        countryNameFr(row.country),
        row.zone,
        String(row.count),
        formatEur(row.totalEur),
      ]),
    ],
  });
});

const amountByCountry = (document: DocumentPreview, normalizeAmount = (value: number) => value) =>
  new Map(
    document.byCountry.map((row) => [
      row.country,
      { ...row, totalEur: normalizeAmount(row.totalEur) },
    ]),
  );

const aggregateByZone = (
  document: DocumentPreview,
  zone: 'NON_EU' | 'UNKNOWN',
  normalizeAmount = (value: number) => value,
) =>
  document.byCountry
    .filter((row) => row.zone === zone)
    .reduce(
      (total, row) => ({
        count: total.count + row.count,
        totalEur: total.totalEur + normalizeAmount(row.totalEur),
      }),
      { count: 0, totalEur: 0 },
    );

export const salesRefundsSummaryTable = (input: {
  readonly sales: DocumentPreview;
  readonly refunds: DocumentPreview;
}) => {
  const salesByCountry = amountByCountry(input.sales);
  const refundsByCountry = amountByCountry(input.refunds, Math.abs);
  const euRows = euCountryCodes.map((country) => {
    const sales = salesByCountry.get(country);
    const refunds = refundsByCountry.get(country);
    const salesTotal = sales?.totalEur ?? 0;
    const refundsTotal = refunds?.totalEur ?? 0;
    return [
      countryNameFr(country),
      'UE',
      formatEur(salesTotal),
      formatEur(refundsTotal),
      formatEur(salesTotal - refundsTotal),
    ];
  });

  const nonEuSales = aggregateByZone(input.sales, 'NON_EU');
  const nonEuRefunds = aggregateByZone(input.refunds, 'NON_EU', Math.abs);
  const unknownSales = aggregateByZone(input.sales, 'UNKNOWN');
  const unknownRefunds = aggregateByZone(input.refunds, 'UNKNOWN', Math.abs);
  const refundsTotal = Math.abs(input.refunds.totalEur);

  return [
    ['Pays', 'Zone', 'Ventes EUR', 'Remboursements EUR', 'Total net EUR'],
    [
      'Hors UE',
      '(TVA non applicable)',
      formatEur(nonEuSales.totalEur),
      formatEur(nonEuRefunds.totalEur),
      formatEur(nonEuSales.totalEur - nonEuRefunds.totalEur),
    ],
    ...euRows,
    [
      'Pays non reconnus',
      'Inconnu',
      formatEur(unknownSales.totalEur),
      formatEur(unknownRefunds.totalEur),
      formatEur(unknownSales.totalEur - unknownRefunds.totalEur),
    ],
    [
      'Total net',
      'Toutes zones',
      formatEur(input.sales.totalEur),
      formatEur(refundsTotal),
      formatEur(input.sales.totalEur - refundsTotal),
    ],
  ];
};

const formatNetAmountEur = (value: string): string => {
  const amount = value.trim();
  if (amount.length === 0 || amount === '--') {
    return amount;
  }
  return `${amount} EUR`;
};

const detailRows = (document: DocumentPreview) =>
  document.outputRows.map((row) => [
    row.createdAt,
    row.orderNumber,
    countryNameFr(row.shippingCountry),
    formatNetAmountEur(row.netAmount),
  ]);

export const generateSalesRefundsPdf = Effect.fn('generation.generateSalesRefundsPdf')(
  function* (input: {
    readonly sales: DocumentPreview;
    readonly refunds: DocumentPreview;
    readonly periodLine?: string;
    readonly generatedOn: string;
  }) {
    yield* Effect.annotateCurrentSpan('sales.rows', input.sales.totalRows);
    yield* Effect.annotateCurrentSpan('refund.rows', input.refunds.totalRows);
    const pdf = yield* PdfService;
    const refundsTotal = Math.abs(input.refunds.totalEur);
    return yield* pdf.summaryWithDetailSectionsPdf({
      title: 'Ventes et remboursements eBay',
      lines: [
        ...optionalLine(input.periodLine),
        `Date de génération: ${input.generatedOn}`,
        `Total ventes: ${formatEur(input.sales.totalEur)}`,
        `Total remboursements: ${formatEur(refundsTotal)}`,
        `Total net: ${formatEur(input.sales.totalEur - refundsTotal)}`,
      ],
      summaryTable: salesRefundsSummaryTable({ sales: input.sales, refunds: input.refunds }),
      sections: [
        {
          title: 'Détail des ventes',
          table: [
            ['Date', 'Numéro de commande', 'Pays de livraison', 'Montant net EUR'],
            ...detailRows(input.sales),
          ],
        },
        {
          title: 'Détail des remboursements',
          table: [
            ['Date', 'Numéro de commande', 'Pays de livraison', 'Montant net EUR'],
            ...detailRows(input.refunds),
          ],
        },
      ],
    });
  },
);

export const generateQuarterPackage = Effect.fn('generation.generateQuarterPackage')(function* (
  input: GeneratePackageInput,
) {
  yield* Effect.annotateCurrentSpan('dossier.year', input.params.year);
  yield* Effect.annotateCurrentSpan('dossier.quarter', input.params.quarter);
  yield* Effect.annotateCurrentSpan('fee.invoice_count', input.fees.length);
  const pdf = yield* PdfService;
  const zip = yield* ZipService;
  const clock = yield* ClockService;
  const sales = yield* previewDocument({ ...input.sales, kind: 'sales' });
  const refunds = yield* previewDocument({ ...input.refunds, kind: 'refunds' });
  const feePreviews = [];

  for (const fee of input.fees) {
    feePreviews.push(yield* previewFeeInvoice(fee));
  }

  const entries: ZipEntry[] = [];
  const generatedOn = (yield* clock.now).toISOString().slice(0, 10);
  const periodLine = `Période: ${input.params.year} ${input.params.quarter}`;

  entries.push({
    name: salesPdfName(input.params.year, input.params.quarter),
    data: yield* generateSalesRefundsPdf({
      sales,
      refunds,
      periodLine,
      generatedOn,
    }),
  });

  for (const feeResult of feePreviews) {
    const fee = feeResult;
    const original = input.feePdfs.find((item) => item.invoiceId === fee.invoiceId);
    if (!original) {
      return yield* Effect.fail(new MissingOriginalPdfError({ invoiceId: fee.invoiceId }));
    }
    entries.push({
      name: ebayFeesPdfName(fee.month, fee.invoiceId),
      data: yield* pdf.withAnnexPage({
        originalPdf: original.bytes,
        originalFileName: original.fileName,
        title: `Total de la facture eBay pour le mois ${monthWithFrenchPreposition(fee.month)} ${fee.year}`,
        lines: [
          'Total multi-devises (converti en EUR)',
          `Net total: ${formatEur(fee.netTotalEur)}`,
          `TVA totale: ${formatEur(fee.vatTotalEur)}`,
        ],
        table: [
          ['Devise', 'Montant devise', 'Taux', 'Montant EUR'],
          ...fee.totalsByCurrency.map((row) => [
            row.currency,
            row.originalTotal.toFixed(2),
            String(row.rateToEur),
            formatEur(row.eurTotal),
          ]),
        ],
        totalEur: fee.totalEur,
      }),
    });
  }

  const zipBytes = yield* zip.create(entries);
  return {
    data: {
      fileName: `dossier_comptable_ebay_${input.params.year}_${input.params.quarter}.zip`,
      bytes: zipBytes,
      manifest: entries.map((entry) => entry.name),
    },
    messages: generationSuccess(entries.length),
  };
});
