import { Effect } from "effect"
import { ExtensionStatus } from "../domain/ExtensionStatus"
import { queryElement } from "../shared/Dom"
import { run } from "../shared/run"
import "../../sidepanel/style.css"

const program = Effect.gen(function*() {
  const extensionStatus = new ExtensionStatus({ surface: "sidepanel", ready: true })
  const status = yield* queryElement<HTMLElement>("#runtime-status")

  yield* Effect.sync(() => {
    status.textContent = "Effect runtime connected"
  })

  yield* Effect.logDebug("Side panel ready").pipe(
    Effect.annotateLogs({ surface: extensionStatus.surface, ready: extensionStatus.ready })
  )
})

run(program)
