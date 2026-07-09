import { Context, Data, Effect, Layer } from 'effect';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export class PdfGenerationError extends Data.TaggedError('PdfGenerationError')<{
  readonly message: string;
  readonly fileName?: string;
}> {}

export type PdfTableRow = readonly string[];
export type PdfDetailsSection = {
  readonly title: string;
  readonly table: readonly PdfTableRow[];
};

export class PdfService extends Context.Tag('PdfService')<
  PdfService,
  {
    readonly summaryPdf: (input: {
      readonly title: string;
      readonly lines: readonly string[];
      readonly table?: readonly PdfTableRow[];
    }) => Effect.Effect<Uint8Array, PdfGenerationError>;
    readonly summaryWithDetailsPdf: (input: {
      readonly title: string;
      readonly lines: readonly string[];
      readonly summaryTable: readonly PdfTableRow[];
      readonly detailsTitle: string;
      readonly detailsTable: readonly PdfTableRow[];
    }) => Effect.Effect<Uint8Array, PdfGenerationError>;
    readonly summaryWithDetailSectionsPdf: (input: {
      readonly title: string;
      readonly lines: readonly string[];
      readonly summaryTable: readonly PdfTableRow[];
      readonly sections: readonly PdfDetailsSection[];
    }) => Effect.Effect<Uint8Array, PdfGenerationError>;
    readonly withAnnexPage: (input: {
      readonly originalPdf: Uint8Array;
      readonly originalFileName: string;
      readonly title: string;
      readonly lines: readonly string[];
      readonly table: readonly PdfTableRow[];
      readonly totalEur: number;
    }) => Effect.Effect<Uint8Array, PdfGenerationError>;
  }
>() {}

const pageSize: [number, number] = [595.28, 841.89];

const addPage = (pdf: PDFDocument) => pdf.addPage(pageSize);

const drawLines = async (
  pdf: PDFDocument,
  title: string,
  lines: readonly string[],
  table?: readonly PdfTableRow[],
  forceNewPage = false,
) => {
  let page =
    forceNewPage || pdf.getPageCount() === 0 ? addPage(pdf) : (pdf.getPages()[pdf.getPageCount() - 1] ?? addPage(pdf));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let y = 790;
  page.drawText(title, { x: 48, y, size: 18, font: bold, color: rgb(0.1, 0.16, 0.14) });
  y -= 34;
  for (const line of lines) {
    page.drawText(line.slice(0, 110), { x: 48, y, size: 10, font });
    y -= 16;
  }
  if (table) {
    y -= 12;
    for (const row of table) {
      if (y < 60) {
        page = addPage(pdf);
        y = 790;
      }
      let x = 48;
      const columnWidth = Math.floor(500 / Math.max(row.length, 1));
      const maxChars = Math.max(10, Math.floor(columnWidth / 5));
      for (const cell of row) {
        page.drawText(cell.slice(0, maxChars), { x, y, size: 9, font });
        x += columnWidth;
      }
      y -= 15;
    }
  }
};

export const PdfServiceLive = Layer.succeed(PdfService, {
  summaryPdf: (input) =>
    Effect.tryPromise({
      try: async () => {
        const pdf = await PDFDocument.create();
        await drawLines(pdf, input.title, input.lines, input.table);
        return pdf.save();
      },
      catch: () => new PdfGenerationError({ message: 'Génération PDF impossible.' }),
    }),
  summaryWithDetailsPdf: (input) =>
    Effect.tryPromise({
      try: async () => {
        const pdf = await PDFDocument.create();
        await drawLines(pdf, input.title, input.lines, input.summaryTable);
        await drawLines(pdf, input.detailsTitle, [], input.detailsTable, true);
        return pdf.save();
      },
      catch: () => new PdfGenerationError({ message: 'Génération PDF impossible.' }),
    }),
  summaryWithDetailSectionsPdf: (input) =>
    Effect.tryPromise({
      try: async () => {
        const pdf = await PDFDocument.create();
        await drawLines(pdf, input.title, input.lines, input.summaryTable);
        for (const section of input.sections) {
          await drawLines(pdf, section.title, [], section.table, true);
        }
        return pdf.save();
      },
      catch: () => new PdfGenerationError({ message: 'Génération PDF impossible.' }),
    }),
  withAnnexPage: (input) =>
    Effect.tryPromise({
      try: async () => {
        const annex = await PDFDocument.create();
        await drawLines(
          annex,
          input.title,
          [
            ...input.lines,
            `Total comptable en EUR: ${input.totalEur.toFixed(2)} EUR`,
            'Les pages suivantes correspondent à la facture eBay officielle non modifiée.',
          ],
          input.table,
        );
        const original = await PDFDocument.load(input.originalPdf);
        const copied = await annex.copyPages(original, original.getPageIndices());
        for (const page of copied) annex.addPage(page);
        return annex.save();
      },
      catch: () =>
        new PdfGenerationError({
          message: "Impossible d'ajouter l'annexe à la facture eBay.",
          fileName: input.originalFileName,
        }),
    }),
});
