import { Effect, Layer } from "effect"
import {
  ClipboardLive,
  ClipboardReadError,
  ClipboardWriteError
} from "../services/Clipboard"
import { TabCreateError, TabsLive, TabsQueryError } from "../services/Tabs"
import { queryElement } from "../shared/Dom"
import { run } from "../shared/run"
import {
  NoValidWebUrlsError,
  copyOpenTabLinks,
  openClipboardLinks,
  type CopyOpenTabLinksResult,
  type OpenClipboardLinksResult
} from "../workflows/TabClipboard"
import "../../sidepanel/style.css"

type ActionError =
  | ClipboardReadError
  | ClipboardWriteError
  | NoValidWebUrlsError
  | TabCreateError
  | TabsQueryError

const AppLive = Layer.mergeAll(TabsLive, ClipboardLive)

const describeError = (error: ActionError): string => {
  switch (error._tag) {
    case "ClipboardReadError":
      return "Could not read the clipboard. Check the extension permission and try again."
    case "ClipboardWriteError":
      return "Could not write to the clipboard. Check the extension permission and try again."
    case "NoValidWebUrlsError":
      return error.source === "tabs"
        ? "No open HTTP(S) tab links were found."
        : "The clipboard does not contain any valid HTTP(S) links."
    case "TabCreateError":
      return `Could not open ${error.url}.`
    case "TabsQueryError":
      return "Could not read the open tabs. Check the extension permission and try again."
  }
}

const describeCopyResult = ({ copied, skipped }: CopyOpenTabLinksResult): string =>
  `Copied ${copied} ${copied === 1 ? "link" : "links"}.${
    skipped === 0 ? "" : ` Skipped ${skipped} non-web or unavailable ${skipped === 1 ? "tab" : "tabs"}.`
  }`

const describeOpenResult = ({ failed, opened, skipped }: OpenClipboardLinksResult): string =>
  `Opened ${opened} ${opened === 1 ? "tab" : "tabs"}.${
    skipped === 0 ? "" : ` Skipped ${skipped} invalid ${skipped === 1 ? "line" : "lines"}.`
  }${failed === 0 ? "" : ` Failed to open ${failed}.`}`

const program = Effect.gen(function*() {
  const copyButton = yield* queryElement<HTMLButtonElement>("#copy-tab-links")
  const openButton = yield* queryElement<HTMLButtonElement>("#open-clipboard-links")
  const status = yield* queryElement<HTMLElement>("#runtime-status")
  const buttons = [copyButton, openButton] as const

  const setBusy = (busy: boolean): void => {
    for (const button of buttons) {
      button.disabled = busy
    }
  }

  const setStatus = (message: string, isError = false): void => {
    status.textContent = message
    if (isError) {
      status.dataset["error"] = "true"
    } else {
      delete status.dataset["error"]
    }
  }

  const runAction = <Result>(
    action: Effect.Effect<Result, ActionError>,
    pendingMessage: string,
    describeResult: (result: Result) => string
  ): void => {
    setBusy(true)
    setStatus(pendingMessage)
    run(
      action.pipe(
        Effect.tap((result) => Effect.sync(() => setStatus(describeResult(result)))),
        Effect.catch((error) => Effect.sync(() => setStatus(describeError(error), true))),
        Effect.ensuring(Effect.sync(() => setBusy(false)))
      )
    )
  }

  yield* Effect.sync(() => {
    copyButton.addEventListener("click", () => {
      runAction(
        copyOpenTabLinks.pipe(Effect.provide(AppLive)),
        "Collecting open tab links...",
        describeCopyResult
      )
    })

    openButton.addEventListener("click", () => {
      runAction(
        openClipboardLinks.pipe(Effect.provide(AppLive)),
        "Reading links from the clipboard...",
        describeOpenResult
      )
    })
  })
})

run(program)
