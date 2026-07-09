import { createContext, createRequestHandler, RouterContextProvider } from 'react-router';

type CloudflareContext = {
  readonly env: Env;
  readonly ctx: ExecutionContext;
};

type MiddlewareRequestHandler = (request: Request, context: RouterContextProvider) => Promise<Response>;

export const cloudflareContext = createContext<CloudflareContext>();

const requestHandler = createRequestHandler(
  // @ts-expect-error React Router generates this module during `react-router build`.
  () => import('../build/server/index.js'),
  'production',
) as MiddlewareRequestHandler;

export default {
  fetch(request, env, ctx) {
    const context = new RouterContextProvider();
    context.set(cloudflareContext, { env, ctx });

    return requestHandler(request, context);
  },
} satisfies ExportedHandler<Env>;
