import { Context, Effect, Layer, Schema } from 'effect';
import type { WebUrl } from '../domain/WebUrl';

export class TabsQueryError extends Schema.TaggedError<TabsQueryError>()(
  'TabsQueryError',
  {
    cause: Schema.Defect(),
  },
) {}

export class TabCreateError extends Schema.TaggedError<TabCreateError>()(
  'TabCreateError',
  {
    url: Schema.String,
    cause: Schema.Defect(),
  },
) {}

export class Tabs extends Context.Service<
  Tabs,
  {
    readonly queryUrlCandidates: Effect.Effect<
      ReadonlyArray<unknown>,
      TabsQueryError
    >;
    readonly open: (url: WebUrl) => Effect.Effect<void, TabCreateError>;
  }
>()('tab-clipboard/services/Tabs') {}

export const TabsLive = Layer.succeed(
  Tabs,
  Tabs.of({
    queryUrlCandidates: Effect.tryPromise({
      try: () => chrome.tabs.query({}),
      catch: (cause) => new TabsQueryError({ cause }),
    }).pipe(Effect.map((tabs) => tabs.map((tab) => tab.url))),
    open: (url) =>
      Effect.tryPromise({
        try: () => chrome.tabs.create({ url: url.href, active: false }),
        catch: (cause) => new TabCreateError({ url: url.href, cause }),
      }).pipe(Effect.asVoid),
  }),
);
