# Obsidian Doom Scroll

Obsidian Doom Scroll is a community plugin for browsing a vault as a continuous, vertically scrollable feed of full Markdown notes.

> [!IMPORTANT]
> The plugin is under active development. Version 0.1.0 has not been released yet.

## Product principles

- Consume existing Obsidian structure: folders, links, backlinks, tags, and Bases.
- Never require plugin-specific metadata or modify notes to support browsing.
- Render Markdown through Obsidian's native renderer.
- Keep large feeds responsive through on-demand mounting and unmounting.
- Treat Android and other mobile clients as primary targets.
- Use supported public Obsidian APIs and stay local and offline.

## Planned v0.1.0

- Folder feeds, with optional subfolders and an anchor note.
- Outgoing-link, backlink, and exact-tag feeds.
- A custom Bases view that preserves the supplied filters, sorting, and limits.
- Virtualized, bidirectional scrolling through full rendered notes.
- Native actions to open or edit a note and exit the feed.
- An internal-link junction menu for starting a related feed.
- In-memory Back and Forward navigation with scroll restoration.
- Desktop and mobile support.

## Development

Requirements:

- Node.js 18 or later.
- npm.

Install dependencies and run all checks:

```sh
npm install
npm run check
```

For a development build that watches source files:

```sh
npm run dev
```

The build writes `main.js` to the project root. For local development, keep the repository at `.obsidian/plugins/obsidian-doom-scroll` so Obsidian can load `main.js`, `manifest.json`, and `styles.css` directly.

## Privacy and security

Obsidian Doom Scroll runs locally. It does not include telemetry, analytics, advertising, remote code loading, or network features. It does not send vault contents, filenames, or metadata anywhere.

The browsing runtime uses Obsidian's cross-platform Vault, Workspace, and MetadataCache APIs. It does not use Node.js filesystem or Electron APIs.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

[MIT](LICENSE)
