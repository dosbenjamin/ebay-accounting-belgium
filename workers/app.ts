import { createContext, createRequestHandler, RouterContextProvider } from 'react-router';

type CloudflareContext = {
  readonly env: Env;
  readonly ctx: ExecutionContext;
};

type MiddlewareRequestHandler = (
  request: Request,
  context: RouterContextProvider,
) => Promise<Response>;

export const cloudflareContext = createContext<CloudflareContext>();

const requestHandler = createRequestHandler(
  // @ts-expect-error React Router generates this module during `react-router build`.
  () => import('../build/server/index.js'),
  'production',
) as MiddlewareRequestHandler;

const securityHeaders = {
  'content-security-policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'referrer-policy': 'same-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
} as const;

const withSecurityHeaders = (response: Response): Response => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export default {
  async fetch(request, env, ctx) {
    const context = new RouterContextProvider();
    context.set(cloudflareContext, { env, ctx });

    return withSecurityHeaders(await requestHandler(request, context));
  },
} satisfies ExportedHandler<Env>;
