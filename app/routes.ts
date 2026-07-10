import { index, layout, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  layout('routes/wizard.tsx', [index('routes/wizard.index.tsx')]),
  route('api/generate-upload', 'routes/api.generate-upload.ts'),
] satisfies RouteConfig;
