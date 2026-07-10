import type { ViewMessage } from './messages';

export type ApiFailure = {
  readonly ok: false;
  readonly messages: readonly ViewMessage[];
  readonly diagnosticsId?: string;
};

export const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
} as const;

export const apiFailure = (
  status: number,
  messages: readonly ViewMessage[],
  diagnosticsId?: string,
): Response =>
  new Response(
    JSON.stringify({
      ok: false,
      messages,
      ...(diagnosticsId ? { diagnosticsId } : {}),
    } satisfies ApiFailure),
    { status, headers: jsonHeaders },
  );
