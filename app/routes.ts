import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  layout('routes/wizard.tsx', [
    index('routes/wizard.index.tsx'),
    route('sales', 'routes/wizard.sales.tsx'),
    route('refunds', 'routes/wizard.refunds.tsx'),
    route('fees', 'routes/wizard.fees.tsx'),
    route('review', 'routes/wizard.review.tsx'),
    route('generate', 'routes/wizard.generate.tsx'),
  ]),
  route('api/csv-preview', 'routes/api.csv-preview.ts'),
  route('api/document-preview', 'routes/api.document-preview.ts'),
  route('api/document-pdf', 'routes/api.document-pdf.ts'),
  route('api/fees-preview', 'routes/api.fees-preview.ts'),
  route('api/review', 'routes/api.review.ts'),
  route('api/generate', 'routes/api.generate.ts'),
] satisfies RouteConfig;
