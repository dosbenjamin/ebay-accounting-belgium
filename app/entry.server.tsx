import { isbot } from 'isbot';
import type { EntryContext, RouterContextProvider } from 'react-router';
import { ServerRouter } from 'react-router';
import { renderToReadableStream } from 'react-dom/server.browser';

export const streamTimeout = 5_000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: RouterContextProvider,
) {
  if (request.method.toUpperCase() === 'HEAD') {
    return new Response(null, {
      status: responseStatusCode,
      headers: responseHeaders,
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), streamTimeout + 1000);
  let shellRendered = false;

  try {
    const stream = await renderToReadableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        signal: controller.signal,
        onError(error) {
          if (shellRendered) {
            console.error(error);
          }

          responseStatusCode = 500;
        },
      },
    );

    shellRendered = true;

    const userAgent = request.headers.get('user-agent');
    if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
      await stream.allReady;
    }

    responseHeaders.set('Content-Type', 'text/html');

    return new Response(stream, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
