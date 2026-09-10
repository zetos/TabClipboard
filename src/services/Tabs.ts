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

const TabQueryResponse = Schema.Array(
  Schema.Struct({ url: Schema.optional(Schema.String) }),
);

const decodeTabQueryResponse = Schema.decodeUnknownEffect(TabQueryResponse);

export interface TabsApi {
  readonly query: (queryInfo: chrome.tabs.QueryInfo) => Promise<unknown>;
  readonly create: (
    createProperties: chrome.tabs.CreateProperties,
  ) => Promise<unknown>;
}

export const makeTabsLive = (tabsApi: TabsApi) =>
  Layer.succeed(
    Tabs,
    Tabs.of({
      queryUrlCandidates: Effect.tryPromise({
        try: () => tabsApi.query({}),
        catch: (cause) => new TabsQueryError({ cause }),
      }).pipe(
        Effect.flatMap((tabs) =>
          decodeTabQueryResponse(tabs).pipe(
            Effect.mapError((cause) => new TabsQueryError({ cause })),
          ),
        ),
        Effect.map((tabs) => tabs.map((tab) => tab.url)),
      ),
      open: (url) =>
        Effect.tryPromise({
          try: () => tabsApi.create({ url: url.href, active: false }),
          catch: (cause) => new TabCreateError({ url: url.href, cause }),
        }).pipe(Effect.asVoid),
    }),
  );

export const TabsLive = makeTabsLive({
  query: (queryInfo) => chrome.tabs.query(queryInfo),
  create: (createProperties) => chrome.tabs.create(createProperties),
});
