export const sanitizeFilePart = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

export const salesPdfName = (year: number, quarter: string): string => `ventes_${year}_${quarter}.pdf`;

export const refundsPdfName = (year: number, quarter: string): string => `remboursements_${year}_${quarter}.pdf`;

export const feesSummaryPdfName = (year: number, quarter: string): string => `synthese_frais_${year}_${quarter}.pdf`;

export const controlCsvName = (year: number, quarter: string): string => `controle_${year}_${quarter}.csv`;

export const ebayFeesPdfName = (month: string): string => `${sanitizeFilePart(month)}_frais_ebay_avec_annexe_eur.pdf`;
