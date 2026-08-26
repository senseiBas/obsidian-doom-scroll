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

## Version 0.1.0 scope

- Folder feeds, with optional subfolders and an anchor note.
- Outgoing-link, backlink, and exact-tag feeds.
- A custom Bases view that preserves the supplied filters, sorting, and limits.
- Virtualized, bidirectional scrolling through full rendered notes.
- Native actions to open or edit a note and exit the feed.
- An internal-link junction menu for starting a related feed.
- In-memory Back and Forward navigation with scroll restoration.
- Desktop and mobile support.

## Using a Base as a feed

Open a `.base` file, add or select a view, and choose **Doom scroll** from
Obsidian's native view-layout menu. The feed uses the exact result set supplied
by Bases, including the configured filters, sorting, and result limit. Changing
the Base configuration updates the feed without changing the source file.

The first result is the initial anchor. Following an internal link to another
note in the same result set offers **Doom scroll: Current Base view**, which
keeps the Base ordering and makes the navigation available to Back and Forward.

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
