# TabClipboard

TabClipboard is a small Chrome extension for moving groups of links between browser tabs and the system clipboard.

It provides two actions:

- Copy the HTTP(S) links from every open tab across all Chrome windows.
- Open one new background tab for each valid HTTP(S) link in the clipboard.

Links are represented as one URL per line. Their order and duplicates are preserved. Blank lines, malformed values, and non-web protocols such as `chrome:` or `file:` are skipped and reported in the extension status.

## Install

### Build From Source

Requirements:

- Chrome 114 or newer
- Node.js 22 or newer
- pnpm 11

Install dependencies and build the extension:

```sh
pnpm install
pnpm build
```

### Load In Chrome

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Select the generated `dist` directory in this repository.
5. Pin TabClipboard from the Chrome extensions menu if desired.

After rebuilding, return to `chrome://extensions` and select the reload button on the TabClipboard card.

## Use

1. Select the TabClipboard toolbar icon.
2. Select **Copy open tabs** to place all open HTTP(S) tab URLs on the clipboard.
3. Select **Open clipboard links** to read one link per line and open each valid HTTP(S) URL in a new background tab.

The status at the bottom of the popup reports copied, opened, skipped, and failed counts. The popup follows your light or dark color-scheme preference without requesting theme access. The extension needs only `tabs`, `clipboardRead`, and `clipboardWrite` permissions for its operations.

## Development

Run a rebuild whenever source files change:

```sh
pnpm dev
```

Run strict TypeScript and Effect diagnostics, tests, and a production build:

```sh
pnpm check
```

Individual commands are also available:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The extension uses TypeScript 7, Effect v4, Vite, and Manifest V3. See `AGENTS.md` for the project architecture and contribution rules.
