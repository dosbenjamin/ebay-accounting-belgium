import type { ViewMessage } from '~/shared/errors/messages';

export type WithMessages<A> = {
  readonly data: A;
  readonly messages: readonly ViewMessage[];
};

export const withMessages = <A>(data: A, messages: readonly ViewMessage[] = []): WithMessages<A> => ({
  data,
  messages,
});
