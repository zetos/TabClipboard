import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer, Ref } from 'effect';
import {
  Clipboard,
  ClipboardReadError,
  ClipboardWriteError,
} from '../src/services/Clipboard';
import { TabCreateError, Tabs, TabsQueryError } from '../src/services/Tabs';
import {
  copyOpenTabLinks,
  openClipboardLinks,
} from '../src/workflows/TabClipboard';

const unusedClipboard = Layer.succeed(
  Clipboard,
  Clipboard.of({
    readText: Effect.succeed(''),
    writeText: () => Effect.void,
  }),
);

const unusedTabs = Layer.succeed(
  Tabs,
  Tabs.of({
    queryUrlCandidates: Effect.succeed([]),
    open: () => Effect.void,
  }),
);

describe('copyOpenTabLinks', () => {
  it.effect(
    'writes normalized web tab URLs in order and preserves duplicates',
    () =>
      Effect.gen(function* () {
        const written = yield* Ref.make('');
        const layer = Layer.mergeAll(
          Layer.succeed(
            Tabs,
            Tabs.of({
              queryUrlCandidates: Effect.succeed([
                'https://example.com/one',
                undefined,
                'chrome://extensions',
                'https://example.com/one',
                'http://effect.website',
              ]),
              open: () => Effect.void,
            }),
          ),
          Layer.succeed(
            Clipboard,
            Clipboard.of({
              readText: Effect.succeed(''),
              writeText: (text) => Ref.set(written, text),
            }),
          ),
        );

        const result = yield* copyOpenTabLinks.pipe(Effect.provide(layer));
        const clipboardText = yield* Ref.get(written);

        assert.deepStrictEqual(result, { copied: 3, skipped: 2 });
        assert.strictEqual(
          clipboardText,
          'https://example.com/one\nhttps://example.com/one\nhttp://effect.website/',
        );
      }),
  );

  it.effect(
    'fails without replacing the clipboard when no web tabs exist',
    () =>
      Effect.gen(function* () {
        const writes = yield* Ref.make(0);
        const layer = Layer.mergeAll(
          Layer.succeed(
            Tabs,
            Tabs.of({
              queryUrlCandidates: Effect.succeed([
                undefined,
                'chrome://settings',
              ]),
              open: () => Effect.void,
            }),
          ),
          Layer.succeed(
            Clipboard,
            Clipboard.of({
              readText: Effect.succeed(''),
              writeText: () => Ref.update(writes, (count) => count + 1),
            }),
          ),
        );

        const error = yield* copyOpenTabLinks.pipe(
          Effect.provide(layer),
          Effect.flip,
        );

        assert.strictEqual(error._tag, 'NoValidWebUrlsError');
        if (error._tag === 'NoValidWebUrlsError') {
          assert.strictEqual(error.skipped, 2);
        }
        assert.strictEqual(yield* Ref.get(writes), 0);
      }),
  );

  it.effect('preserves typed query and clipboard write failures', () =>
    Effect.gen(function* () {
      const queryError = new TabsQueryError({ cause: 'query rejected' });
      const queryLayer = Layer.mergeAll(
        Layer.succeed(
          Tabs,
          Tabs.of({
            queryUrlCandidates: Effect.fail(queryError),
            open: () => Effect.void,
          }),
        ),
        unusedClipboard,
      );
      const queryFailure = yield* copyOpenTabLinks.pipe(
        Effect.provide(queryLayer),
        Effect.flip,
      );

      assert.strictEqual(queryFailure, queryError);

      const writeError = new ClipboardWriteError({ cause: 'write rejected' });
      const writeLayer = Layer.mergeAll(
        Layer.succeed(
          Tabs,
          Tabs.of({
            queryUrlCandidates: Effect.succeed(['https://example.com']),
            open: () => Effect.void,
          }),
        ),
        Layer.succeed(
          Clipboard,
          Clipboard.of({
            readText: Effect.succeed(''),
            writeText: () => Effect.fail(writeError),
          }),
        ),
      );
      const writeFailure = yield* copyOpenTabLinks.pipe(
        Effect.provide(writeLayer),
        Effect.flip,
      );

      assert.strictEqual(writeFailure, writeError);
    }),
  );
});

describe('openClipboardLinks', () => {
  it.effect(
    'opens valid URLs sequentially and reports skipped and failed entries',
    () =>
      Effect.gen(function* () {
        const attempts = yield* Ref.make<ReadonlyArray<string>>([]);
        const layer = Layer.mergeAll(
          Layer.succeed(
            Clipboard,
            Clipboard.of({
              readText: Effect.succeed(
                'https://example.com/a\ninvalid\n\nhttps://example.com/a\nhttps://fail.example',
              ),
              writeText: () => Effect.void,
            }),
          ),
          Layer.succeed(
            Tabs,
            Tabs.of({
              queryUrlCandidates: Effect.succeed([]),
              open: (url) =>
                Ref.update(attempts, (urls) => [...urls, url.href]).pipe(
                  Effect.andThen(
                    url.hostname === 'fail.example'
                      ? Effect.fail(
                          new TabCreateError({
                            url: url.href,
                            cause: 'create rejected',
                          }),
                        )
                      : Effect.void,
                  ),
                ),
            }),
          ),
        );

        const result = yield* openClipboardLinks.pipe(Effect.provide(layer));

        assert.deepStrictEqual(result, { opened: 2, skipped: 2, failed: 1 });
        assert.deepStrictEqual(yield* Ref.get(attempts), [
          'https://example.com/a',
          'https://example.com/a',
          'https://fail.example/',
        ]);
      }),
  );

  it.effect('reports when every valid tab fails to open', () =>
    Effect.gen(function* () {
      const layer = Layer.mergeAll(
        Layer.succeed(
          Clipboard,
          Clipboard.of({
            readText: Effect.succeed(
              'https://example.com/a\nhttps://example.com/b',
            ),
            writeText: () => Effect.void,
          }),
        ),
        Layer.succeed(
          Tabs,
          Tabs.of({
            queryUrlCandidates: Effect.succeed([]),
            open: (url) =>
              Effect.fail(
                new TabCreateError({
                  url: url.href,
                  cause: 'create rejected',
                }),
              ),
          }),
        ),
      );

      const result = yield* openClipboardLinks.pipe(Effect.provide(layer));

      assert.deepStrictEqual(result, { opened: 0, skipped: 0, failed: 2 });
    }),
  );

  it.effect('fails when the clipboard has no valid web URLs', () =>
    Effect.gen(function* () {
      const layer = Layer.mergeAll(
        Layer.succeed(
          Clipboard,
          Clipboard.of({
            readText: Effect.succeed('not a url\nchrome://settings'),
            writeText: () => Effect.void,
          }),
        ),
        unusedTabs,
      );

      const error = yield* openClipboardLinks.pipe(
        Effect.provide(layer),
        Effect.flip,
      );

      assert.strictEqual(error._tag, 'NoValidWebUrlsError');
      if (error._tag === 'NoValidWebUrlsError') {
        assert.strictEqual(error.source, 'clipboard');
        assert.strictEqual(error.skipped, 2);
      }
    }),
  );

  it.effect('preserves a typed clipboard read failure', () =>
    Effect.gen(function* () {
      const readError = new ClipboardReadError({ cause: 'read rejected' });
      const layer = Layer.mergeAll(
        Layer.succeed(
          Clipboard,
          Clipboard.of({
            readText: Effect.fail(readError),
            writeText: () => Effect.void,
          }),
        ),
        unusedTabs,
      );

      const error = yield* openClipboardLinks.pipe(
        Effect.provide(layer),
        Effect.flip,
      );

      assert.strictEqual(error, readError);
    }),
  );
});
