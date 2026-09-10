import { Context, Effect, Layer, Schema } from "effect"

export class ChromeApiError extends Schema.TaggedError<ChromeApiError>()("ChromeApiError", {
  operation: Schema.String,
  cause: Schema.Defect()
}) {}

export class SidePanel extends Context.Service<SidePanel, {
  readonly open: Effect.Effect<void, ChromeApiError>
}>()("tab-clipboard/services/SidePanel") {
  static readonly layer = Layer.succeed(
    SidePanel,
    SidePanel.of({
      open: Effect.tryPromise({
        try: () => chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT }),
        catch: (cause) => new ChromeApiError({ operation: "sidePanel.open", cause })
      })
    })
  )
}

export const openSidePanel = Effect.gen(function*() {
  const sidePanel = yield* SidePanel
  yield* sidePanel.open
})
