import { Effect, Schema } from "effect"
import { parseClipboardText, parseWebUrlCandidates, serializeWebUrls } from "../domain/WebUrl"
import { Clipboard } from "../services/Clipboard"
import { Tabs } from "../services/Tabs"

export class NoValidWebUrlsError extends Schema.TaggedError<NoValidWebUrlsError>()(
  "NoValidWebUrlsError",
  {
    source: Schema.Literals(["tabs", "clipboard"]),
    skipped: Schema.Finite
  }
) {}

export interface CopyOpenTabLinksResult {
  readonly copied: number
  readonly skipped: number
}

export interface OpenClipboardLinksResult {
  readonly opened: number
  readonly skipped: number
  readonly failed: number
}

export const copyOpenTabLinks = Effect.gen(function*() {
  const tabs = yield* Tabs
  const clipboard = yield* Clipboard
  const candidates = yield* tabs.queryUrlCandidates
  const parsed = yield* parseWebUrlCandidates(candidates)

  if (parsed.urls.length === 0) {
    return yield* new NoValidWebUrlsError({ source: "tabs", skipped: parsed.skipped })
  }

  yield* clipboard.writeText(serializeWebUrls(parsed.urls))

  return {
    copied: parsed.urls.length,
    skipped: parsed.skipped
  } satisfies CopyOpenTabLinksResult
})

export const openClipboardLinks = Effect.gen(function*() {
  const tabs = yield* Tabs
  const clipboard = yield* Clipboard
  const text = yield* clipboard.readText
  const parsed = yield* parseClipboardText(text)

  if (parsed.urls.length === 0) {
    return yield* new NoValidWebUrlsError({ source: "clipboard", skipped: parsed.skipped })
  }

  const [failures] = yield* Effect.partition(parsed.urls, tabs.open, { concurrency: 1 })

  return {
    opened: parsed.urls.length - failures.length,
    skipped: parsed.skipped,
    failed: failures.length
  } satisfies OpenClipboardLinksResult
})
