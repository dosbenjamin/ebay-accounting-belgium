import { Effect } from 'effect';
import { previewFeeInvoice } from '~/features/ebay-fees/service';
import { previewDocument } from '~/features/sales/service';
import {
  controlCsvName,
  ebayFeesPdfName,
  feesSummaryPdfName,
  refundsPdfName,
  salesPdfName,
} from '~/shared/files/names';
import { PdfService } from '~/shared/pdf/service';
import { ZipService, type ZipEntry } from '~/shared/zip/service';
import { MissingOriginalPdfError, type GenerationError } from './errors';
import { generationSuccess } from './messages';
import type { GeneratedPackage, GeneratePackageInput } from './schemas';

const encoder = new TextEncoder();

type SalesSummaryInput = {
  readonly data: {
    readonly byCountry: readonly {
      readonly country: string;
      readonly zone: 'EU' | 'NON_EU' | 'UNKNOWN';
      readonly count: number;
      readonly totalEur: number;
    }[];
    readonly totalRows: number;
    readonly totalEur: number;
    readonly nonEuTotal: number;
    readonly unknownTotal: number;
  };
};

const salesSummaryTable = (sales: SalesSummaryInput) => {
  const euRows = sales.data.byCountry
    .filter((row) => row.zone === 'EU')
    .map((row) => [row.country, String(row.count), row.totalEur.toFixed(2)]);
  const nonEuCount = sales.data.byCountry
    .filter((row) => row.zone === 'NON_EU')
    .reduce((sum, row) => sum + row.count, 0);
  const unknownCount = sales.data.byCountry
    .filter((row) => row.zone === 'UNKNOWN')
    .reduce((sum, row) => sum + row.count, 0);

  return [
    ['Zone / pays', 'Lignes', 'Total EUR'],
    ...euRows,
    ['Hors UE', String(nonEuCount), sales.data.nonEuTotal.toFixed(2)],
    ['Pays non reconnus', String(unknownCount), sales.data.unknownTotal.toFixed(2)],
    ['Total ventes', String(sales.data.totalRows), sales.data.totalEur.toFixed(2)],
  ];
};

export const generateQuarterPackage = (
  input: GeneratePackageInput,
): Effect.Effect<
  { readonly data: GeneratedPackage; readonly messages: ReturnType<typeof generationSuccess> },
  GenerationError,
  PdfService | ZipService | import('~/shared/csv/service').CsvParser
> =>
  Effect.gen(function* () {
    const pdf = yield* PdfService;
    const zip = yield* ZipService;
    const sales = yield* previewDocument({ ...input.sales, kind: 'sales' });
    const refunds = yield* previewDocument({ ...input.refunds, kind: 'refunds' });
    const feePreviews = [];

    for (const fee of input.fees) {
      feePreviews.push(yield* previewFeeInvoice(fee));
    }

    const entries: ZipEntry[] = [];
    const generatedOn = new Date().toISOString().slice(0, 10);
    const periodLine = `Periode: ${input.params.year} ${input.params.quarter}`;

    entries.push({
      name: salesPdfName(input.params.year, input.params.quarter),
      data: yield* pdf.summaryWithDetailsPdf({
        title: 'Ventes trimestrielles eBay',
        lines: [
          periodLine,
          `Date de generation: ${generatedOn}`,
          `Total ventes: ${sales.data.totalEur.toFixed(2)} EUR`,
          `Total UE: ${sales.data.euTotal.toFixed(2)} EUR`,
          `Total hors UE: ${sales.data.nonEuTotal.toFixed(2)} EUR`,
        ],
        summaryTable: salesSummaryTable(sales),
        detailsTitle: 'Detail des ventes',
        detailsTable: [
          ['Date de création de la transaction', 'Numéro de commande', 'Pays de livraison', "Numéro de l'objet"],
          ...sales.data.outputRows.map((row) => [row.createdAt, row.orderNumber, row.shippingCountry, row.itemNumber]),
        ],
      }),
    });

    entries.push({
      name: refundsPdfName(input.params.year, input.params.quarter),
      data: yield* pdf.summaryPdf({
        title: 'Remboursements trimestriels eBay',
        lines: [
          periodLine,
          `Date de generation: ${generatedOn}`,
          `Total remboursements: ${refunds.data.totalEur.toFixed(2)} EUR`,
          `Total UE: ${refunds.data.euTotal.toFixed(2)} EUR`,
          `Total hors UE: ${refunds.data.nonEuTotal.toFixed(2)} EUR`,
        ],
        table: [
          ['Pays', 'Zone', 'Lignes', 'Total EUR'],
          ...refunds.data.byCountry.map((row) => [row.country, row.zone, String(row.count), row.totalEur.toFixed(2)]),
        ],
      }),
    });

    for (const feeResult of feePreviews) {
      const fee = feeResult.data;
      const original = input.feePdfs.find((item) => item.invoiceId === fee.invoiceId);
      if (!original) {
        return yield* Effect.fail(new MissingOriginalPdfError({ invoiceId: fee.invoiceId }));
      }
      entries.push({
        name: ebayFeesPdfName(fee.month),
        data: yield* pdf.withAnnexPage({
          originalPdf: original.bytes,
          originalFileName: original.fileName,
          title: 'Annexe - Conversion comptable en EUR',
          lines: [`Mois: ${fee.month}`, `Annee: ${fee.year}`, `Fichier PDF original: ${original.fileName}`],
          table: [
            ['Devise', 'Montant devise', 'Taux', 'Montant EUR'],
            ...fee.totalsByCurrency.map((row) => [
              row.currency,
              row.originalTotal.toFixed(2),
              String(row.rateToEur),
              row.eurTotal.toFixed(2),
            ]),
          ],
          totalEur: fee.totalEur,
        }),
      });
    }

    const totalFees = feePreviews.reduce((sum, fee) => sum + fee.data.totalEur, 0);
    entries.push({
      name: feesSummaryPdfName(input.params.year, input.params.quarter),
      data: yield* pdf.summaryPdf({
        title: 'Synthese frais eBay',
        lines: [periodLine, `Total frais global: ${totalFees.toFixed(2)} EUR`],
        table: [
          ['Facture', 'Mois', 'Total EUR'],
          ...feePreviews.map((fee) => [fee.data.invoiceId, fee.data.month, fee.data.totalEur.toFixed(2)]),
        ],
      }),
    });

    entries.push({
      name: controlCsvName(input.params.year, input.params.quarter),
      data: encoder.encode(
        [
          'type,reference,total_eur',
          `ventes,${input.params.quarter},${sales.data.totalEur.toFixed(2)}`,
          `remboursements,${input.params.quarter},${refunds.data.totalEur.toFixed(2)}`,
          ...feePreviews.map((fee) => `frais,${fee.data.invoiceId},${fee.data.totalEur.toFixed(2)}`),
        ].join('\n'),
      ),
    });

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
