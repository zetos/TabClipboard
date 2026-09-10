import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { decodeExtensionStatus } from "../src/domain/ExtensionStatus"

describe("ExtensionStatus", () => {
  it.effect("decodes a valid extension status", () =>
    Effect.gen(function*() {
      const status = yield* decodeExtensionStatus({ surface: "popup", ready: true })

      assert.strictEqual(status.surface, "popup")
      assert.isTrue(status.ready)
    }))

  it.effect("rejects an unknown surface", () =>
    decodeExtensionStatus({ surface: "options", ready: true }).pipe(
      Effect.flip,
      Effect.map((error) => assert.include(error.message, "surface"))
    ))
})
