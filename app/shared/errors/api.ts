import type { ViewMessage } from './messages';

export type ApiSuccess<A> = {
  readonly ok: true;
  readonly data: A;
  readonly messages: readonly ViewMessage[];
};

export type ApiFailure = {
  readonly ok: false;
  readonly messages: readonly ViewMessage[];
  readonly diagnosticsId?: string;
};

export type ApiResponse<A> = ApiSuccess<A> | ApiFailure;

export const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
} as const;

export const apiSuccess = <A>(data: A, messages: readonly ViewMessage[] = []): Response =>
  new Response(JSON.stringify({ ok: true, data, messages } satisfies ApiSuccess<A>), {
    headers: jsonHeaders,
  });

export const apiFailure = (status: number, messages: readonly ViewMessage[], diagnosticsId?: string): Response =>
  new Response(
    JSON.stringify({
      ok: false,
      messages,
      ...(diagnosticsId ? { diagnosticsId } : {}),
    } satisfies ApiFailure),
    { status, headers: jsonHeaders },
  );
