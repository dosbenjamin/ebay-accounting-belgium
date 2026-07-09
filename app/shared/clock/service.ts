import { Context, Effect, Layer } from 'effect';

export class ClockService extends Context.Tag('ClockService')<
  ClockService,
  {
    readonly now: Effect.Effect<Date>;
  }
>() {}

export const ClockServiceLive = Layer.succeed(ClockService, {
  now: Effect.sync(() => new Date()),
});
