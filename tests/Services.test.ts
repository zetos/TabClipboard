import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { Clipboard, makeClipboardLive } from '../src/services/Clipboard';
import { makeTabsLive, Tabs } from '../src/services/Tabs';

const unusedClipboardApi = {
  readText: () => Promise.resolve(''),
  writeText: () => Promise.resolve(undefined),
};

const unusedTabsApi = {
  query: () => Promise.resolve([]),
  create: () => Promise.resolve(undefined),
};

describe('ClipboardLive', () => {
  it.effect('decodes valid clipboard text without changing it', () =>
    Effect.gen(function* () {
      const text = 'https://example.com\nhttps://effect.website';
      const result = yield* Clipboard.use(
        (clipboard) => clipboard.readText,
      ).pipe(
        Effect.provide(
          makeClipboardLive({
            ...unusedClipboardApi,
            readText: () => Promise.resolve(text),
          }),
        ),
      );

      assert.strictEqual(result, text);
    }),
  );

  it.effect('maps malformed clipboard output to ClipboardReadError', () =>
    Effect.gen(function* () {
      const malformedValues: ReadonlyArray<unknown> = [
        undefined,
        null,
        {},
        123,
      ];

      yield* Effect.forEach(malformedValues, (value) =>
        Effect.gen(function* () {
          const error = yield* Clipboard.use(
            (clipboard) => clipboard.readText,
          ).pipe(
            Effect.provide(
              makeClipboardLive({
                ...unusedClipboardApi,
                readText: () => Promise.resolve(value),
              }),
            ),
            Effect.flip,
          );

          assert.strictEqual(error._tag, 'ClipboardReadError');
        }),
      );
    }),
  );

  it.effect('maps a rejected read exactly once', () =>
    Effect.gen(function* () {
      const cause = { operation: 'read' };
      const error = yield* Clipboard.use(
        (clipboard) => clipboard.readText,
      ).pipe(
        Effect.provide(
          makeClipboardLive({
            ...unusedClipboardApi,
            readText: () => Promise.reject(cause),
          }),
        ),
        Effect.flip,
      );

      assert.strictEqual(error._tag, 'ClipboardReadError');
      assert.strictEqual(error.cause, cause);
    }),
  );
});

describe('TabsLive', () => {
  it.effect('decodes tab records without deciding URL validity', () =>
    Effect.gen(function* () {
      const candidates = yield* Tabs.use(
        (tabs) => tabs.queryUrlCandidates,
      ).pipe(
        Effect.provide(
          makeTabsLive({
            ...unusedTabsApi,
            query: () =>
              Promise.resolve([
                {},
                { url: 'https://example.com' },
                { url: 'chrome://settings' },
                { url: 'not a url' },
              ]),
          }),
        ),
      );

      assert.deepStrictEqual(candidates, [
        undefined,
        'https://example.com',
        'chrome://settings',
        'not a url',
      ]);
    }),
  );

  it.effect('maps malformed query responses to TabsQueryError', () =>
    Effect.gen(function* () {
      const malformedValues: ReadonlyArray<unknown> = [
        undefined,
        null,
        {},
        'invalid',
        [null],
        [42],
        [{ url: 42 }],
      ];

      yield* Effect.forEach(malformedValues, (value) =>
        Effect.gen(function* () {
          const error = yield* Tabs.use((tabs) => tabs.queryUrlCandidates).pipe(
            Effect.provide(
              makeTabsLive({
                ...unusedTabsApi,
                query: () => Promise.resolve(value),
              }),
            ),
            Effect.flip,
          );

          assert.strictEqual(error._tag, 'TabsQueryError');
        }),
      );
    }),
  );

  it.effect('maps a rejected query exactly once', () =>
    Effect.gen(function* () {
      const cause = { operation: 'query' };
      const error = yield* Tabs.use((tabs) => tabs.queryUrlCandidates).pipe(
        Effect.provide(
          makeTabsLive({
            ...unusedTabsApi,
            query: () => Promise.reject(cause),
          }),
        ),
        Effect.flip,
      );

      assert.strictEqual(error._tag, 'TabsQueryError');
      assert.strictEqual(error.cause, cause);
    }),
  );
});
