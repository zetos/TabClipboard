import { Context, Effect, Layer, Schema } from 'effect';

export class ClipboardReadError extends Schema.TaggedError<ClipboardReadError>()(
  'ClipboardReadError',
  { cause: Schema.Defect() },
) {}

export class ClipboardWriteError extends Schema.TaggedError<ClipboardWriteError>()(
  'ClipboardWriteError',
  { cause: Schema.Defect() },
) {}

export class Clipboard extends Context.Service<
  Clipboard,
  {
    readonly readText: Effect.Effect<string, ClipboardReadError>;
    readonly writeText: (
      text: string,
    ) => Effect.Effect<void, ClipboardWriteError>;
  }
>()('tab-clipboard/services/Clipboard') {}

const decodeClipboardText = Schema.decodeUnknownEffect(Schema.String);

export interface ClipboardApi {
  readonly readText: () => Promise<unknown>;
  readonly writeText: (text: string) => Promise<unknown>;
}

export const makeClipboardLive = (clipboard: ClipboardApi) =>
  Layer.succeed(
    Clipboard,
    Clipboard.of({
      readText: Effect.tryPromise({
        try: () => clipboard.readText(),
        catch: (cause) => new ClipboardReadError({ cause }),
      }).pipe(
        Effect.flatMap((text) =>
          decodeClipboardText(text).pipe(
            Effect.mapError((cause) => new ClipboardReadError({ cause })),
          ),
        ),
      ),
      writeText: (text) =>
        Effect.tryPromise({
          try: () => clipboard.writeText(text),
          catch: (cause) => new ClipboardWriteError({ cause }),
        }).pipe(Effect.asVoid),
    }),
  );

export const ClipboardLive = makeClipboardLive({
  readText: () => navigator.clipboard.readText(),
  writeText: (text) => navigator.clipboard.writeText(text),
});
