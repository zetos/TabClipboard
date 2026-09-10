import { Context, Effect, Layer, Schema } from "effect"

export class SidePanelOpenError extends Schema.TaggedError<SidePanelOpenError>()("SidePanelOpenError", {
  cause: Schema.Defect()
}) {}

export class SidePanel extends Context.Service<SidePanel, {
  readonly open: Effect.Effect<void, SidePanelOpenError>
}>()("tab-clipboard/services/SidePanel") {
  static readonly layer = Layer.succeed(
    SidePanel,
    SidePanel.of({
      open: Effect.tryPromise({
        try: () => chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT }),
        catch: (cause) => new SidePanelOpenError({ cause })
      })
    })
  )
}

export const openSidePanel = Effect.gen(function*() {
  const sidePanel = yield* SidePanel
  yield* sidePanel.open
})
