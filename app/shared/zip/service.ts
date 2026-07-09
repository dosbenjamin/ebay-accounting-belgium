import { Context, Data, Effect, Layer } from 'effect';
import { zipSync } from 'fflate';

export class ZipGenerationError extends Data.TaggedError('ZipGenerationError')<{
  readonly message: string;
}> {}

export type ZipEntry = {
  readonly name: string;
  readonly data: Uint8Array;
};

export class ZipService extends Context.Tag('ZipService')<
  ZipService,
  {
    readonly create: (entries: readonly ZipEntry[]) => Effect.Effect<Uint8Array, ZipGenerationError>;
  }
>() {}

export const ZipServiceLive = Layer.succeed(ZipService, {
  create: (entries) =>
    Effect.try({
      try: () => zipSync(Object.fromEntries(entries.map((entry) => [entry.name, entry.data]))),
      catch: () => new ZipGenerationError({ message: 'Generation ZIP impossible.' }),
    }),
});
