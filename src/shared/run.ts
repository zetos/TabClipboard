import { Effect } from "effect"

export const run = (program: Effect.Effect<void, unknown>): void => {
  Effect.runFork(
    program.pipe(
      Effect.catchCause((cause) => Effect.logError("Extension program failed", cause))
    )
  )
}
