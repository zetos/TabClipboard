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

export const ClipboardLive = Layer.succeed(
  Clipboard,
  Clipboard.of({
    readText: Effect.tryPromise({
      try: () => navigator.clipboard.readText(),
      catch: (cause) => new ClipboardReadError({ cause }),
    }).pipe(
      Effect.flatMap(decodeClipboardText),
      Effect.mapError((cause) => new ClipboardReadError({ cause })),
    ),
    writeText: (text) =>
      Effect.tryPromise({
        try: () => navigator.clipboard.writeText(text),
        catch: (cause) => new ClipboardWriteError({ cause }),
      }),
  }),
);
