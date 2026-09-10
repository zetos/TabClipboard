import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import {
  parseClipboardText,
  parseWebUrlCandidates,
  serializeWebUrls
} from "../src/domain/WebUrl"

describe("WebUrl", () => {
  it.effect("accepts only HTTP(S) candidates and normalizes them", () =>
    Effect.gen(function*() {
      const result = yield* parseWebUrlCandidates([
        "https://example.com/path",
        "http://effect.website",
        "chrome://settings",
        undefined,
        "not a url"
      ])

      assert.deepStrictEqual(
        result.urls.map((url) => url.href),
        ["https://example.com/path", "http://effect.website/"]
      )
      assert.strictEqual(result.skipped, 3)
    }))

  it.effect("preserves clipboard order and duplicates while counting blank lines", () =>
    Effect.gen(function*() {
      const result = yield* parseClipboardText(
        " https://example.com/a \r\n\r\ninvalid\r\nhttps://example.com/a"
      )

      assert.deepStrictEqual(
        result.urls.map((url) => url.href),
        ["https://example.com/a", "https://example.com/a"]
      )
      assert.strictEqual(result.skipped, 2)
      assert.strictEqual(serializeWebUrls(result.urls), "https://example.com/a\nhttps://example.com/a")
    }))

  it.effect("treats an empty clipboard as an empty list", () =>
    Effect.gen(function*() {
      const result = yield* parseClipboardText("")

      assert.deepStrictEqual(result.urls, [])
      assert.strictEqual(result.skipped, 0)
    }))
})
