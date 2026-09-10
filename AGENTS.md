# TabClipboard Engineering Guide

## Architecture

- Use Effect v4 for asynchronous work, dependency injection, typed failures, and resource composition.
- Design features declaratively before writing browser implementations. Define domain functions and service capabilities first, then provide live `chrome.*` or DOM adapters at the application boundary.
- Keep direct access to `chrome.*`, `navigator.clipboard`, and `document` out of domain workflows.
- Model external input with `Schema`. Clipboard text, tab URLs, messages, persisted values, and other browser data must be decoded before use.
- Model expected failures with `Schema.TaggedError`. Do not throw strings or generic `Error` values for recoverable failures.
- Define capabilities with `Context.Service` and implementations with explicit `Layer` values. Compose live dependencies at entry points with `Layer.mergeAll` and `Effect.provide`.
- Prefer immutable readonly data, pure transformations, `Effect.gen`, `Effect.fn`, and collection combinators over mutation and imperative control flow.
- Keep UI event handlers thin. They may update presentation state and run a workflow, but feature logic belongs in domain or workflow modules.

## Testing

- Test workflows through fake service layers rather than mocking browser globals.
- Test schemas and pure transformations independently from live adapters.
- Use `@effect/vitest` for Effect-based tests.
- Cover success, typed failure, invalid external input, ordering, duplicates, and partial batch failures.
- Run `pnpm check` before considering a change complete.

## Effect Reference

- The local Effect v4 source is available through the `effect` project reference configured in `opencode.json`.
- Consult that source when an API or v4 convention is unclear rather than relying on Effect v3 patterns.
- This project uses `Context.Service`, explicit live/test layers, `Schema.TaggedError`, and `Effect.tryPromise` from Effect v4.

## Scope

- TabClipboard has two feature workflows: copy every open HTTP(S) tab URL and open every valid HTTP(S) URL from the clipboard.
- URL lists use one URL per line. Preserve order and duplicates, skip blank or invalid lines, and report skipped or failed entries to the user.
- Request only the Chrome permissions required by these workflows.
