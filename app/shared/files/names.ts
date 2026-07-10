export const sanitizeFilePart = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

export const salesPdfName = (year: number, quarter: string): string =>
  `ventes_${year}_${quarter}.pdf`;

export const ebayFeesPdfName = (month: string, invoiceId?: string): string =>
  `${sanitizeFilePart([month, invoiceId].filter(Boolean).join('_'))}_frais_ebay_avec_annexe_eur.pdf`;
