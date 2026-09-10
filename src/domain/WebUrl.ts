import { Effect, Schema } from "effect"

export const WebUrl = Schema.URLFromString.pipe(
  Schema.check(
    Schema.makeFilter((url) =>
      url.protocol === "http:" || url.protocol === "https:"
        ? undefined
        : "Expected an HTTP(S) URL"
    )
  ),
  Schema.brand("WebUrl")
)

export type WebUrl = typeof WebUrl.Type

export interface ParsedWebUrls {
  readonly urls: ReadonlyArray<WebUrl>
  readonly skipped: number
}

const decodeWebUrl = Schema.decodeUnknownEffect(WebUrl)

export const parseWebUrlCandidates = (
  candidates: ReadonlyArray<unknown>
): Effect.Effect<ParsedWebUrls> =>
  Effect.partition(candidates, (candidate) => decodeWebUrl(candidate)).pipe(
    Effect.map(([invalid, urls]) => ({ urls, skipped: invalid.length }))
  )

export const parseClipboardText = (text: string): Effect.Effect<ParsedWebUrls> =>
  parseWebUrlCandidates(
    text.length === 0 ? [] : text.split(/\r?\n/u).map((line) => line.trim())
  )

export const serializeWebUrls = (urls: ReadonlyArray<WebUrl>): string =>
  urls.map((url) => url.href).join("\n")
