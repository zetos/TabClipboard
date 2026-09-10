import { Effect } from "effect"
import { SidePanel, openSidePanel } from "../services/SidePanel"
import { queryElement } from "../shared/Dom"
import { run } from "../shared/run"
import "../../popup/style.css"

const program = Effect.gen(function*() {
  const button = yield* queryElement<HTMLButtonElement>("#open-side-panel")
  const status = yield* queryElement<HTMLParagraphElement>("#status")

  yield* Effect.sync(() => {
    button.addEventListener("click", () => {
      status.textContent = "Opening workspace..."
      run(
        openSidePanel.pipe(
          Effect.provide(SidePanel.layer),
          Effect.tap(() => Effect.sync(() => window.close())),
          Effect.catch(() =>
            Effect.sync(() => {
              status.dataset["error"] = "true"
              status.textContent = "Could not open the workspace. Try again."
            })
          )
        )
      )
    })
  })

})

run(program)
