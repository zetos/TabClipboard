import { Effect } from "effect"
import { ExtensionStatus } from "../domain/ExtensionStatus"
import { SidePanel, openSidePanel } from "../services/SidePanel"
import { queryElement } from "../shared/Dom"
import { run } from "../shared/run"
import "../../popup/style.css"

const program = Effect.gen(function*() {
  const extensionStatus = new ExtensionStatus({ surface: "popup", ready: true })
  const button = yield* queryElement<HTMLButtonElement>("#open-side-panel")
  const status = yield* queryElement<HTMLParagraphElement>("#status")

  yield* Effect.sync(() => {
    button.addEventListener("click", () => {
      status.textContent = "Opening workspace..."
      run(
        openSidePanel.pipe(
          Effect.provide(SidePanel.layer),
          Effect.tap(() => Effect.sync(() => window.close())),
          Effect.catch((error) =>
            Effect.sync(() => {
              status.dataset["error"] = "true"
              status.textContent = `Could not open workspace: ${error.operation}`
            })
          )
        )
      )
    })
  })

  yield* Effect.logDebug("Popup ready").pipe(
    Effect.annotateLogs({ surface: extensionStatus.surface, ready: extensionStatus.ready })
  )
})

run(program)
