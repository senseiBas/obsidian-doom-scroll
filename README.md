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
- Native actions to open a note, plus an inline desktop Quick Edit mode.
- An internal-link junction menu for starting a related feed.
- In-memory Back and Forward navigation with scroll restoration.
- Desktop and mobile support.

## Commands and entry points

- Use the ribbon icon or **Doom scroll: Open feed…** while a Markdown note is
  active.
- Use **Doom scroll…** from a Markdown file's context menu.
- Use **Doom scroll folder…** from a folder's context menu in the file explorer.
- Choose Folder, Folder + subfolders, Outgoing links, Backlinks, or one exact
  tag from the source picker.
- Choose **Choose a folder…** from that picker, or run **Doom scroll: Open
  folder feed…**, to browse any vault folder. Select whether subfolders should
  be included; the first note in natural filename order becomes the anchor.
- Use **Doom scroll: Exit feed to anchor note** or the visible **Exit feed**
  button to return to the anchor in source mode, focused at the end of the note.
- Each rendered note has **Open** and **Quick edit** actions on desktop. Quick
  Edit shows the raw Markdown inside the card with **Save**, **Cancel**, and
  **Save & open full editor** actions. On mobile, the edit action opens
  Obsidian's normal editor.

## Using a Base as a feed

Open a `.base` file, add or select a view, and choose **Doom scroll** from
Obsidian's native view-layout menu. The feed uses the exact result set supplied
by Bases, including the configured filters, sorting, and result limit. Changing
the Base configuration updates the feed without changing the source file.

The first result is the initial anchor. Following an internal link to another
note in the same result set offers **Doom scroll: Current Base view**, which
keeps the Base ordering and makes the navigation available to Back and Forward.

## Architecture

Feed state describes only the source type, anchor, and source parameters.
Dedicated source resolvers turn that state into an ordered list of vault files.
This keeps folder, link, backlink, tag, and Base logic separate so more source
types can be added without coupling them to rendering.

The shared virtual feed estimates the full scroll height but mounts only the
visible notes and a small overscan buffer. Measured note heights replace those
estimates, with scroll correction when content above the viewport changes.
Every mounted note owns an Obsidian component lifecycle and uses
`MarkdownRenderer`, so unmounted notes also release their render children and
listeners.

Internal links are intercepted only inside rendered feed notes. The junction
menu can open the destination normally or branch to a new feed. Feed contexts
and scroll positions are kept in memory for Back and Forward navigation.
Rendered tags use a similar junction: open the tag through Obsidian normally or
start an exact-tag Doom Scroll feed.

Desktop Quick Edit uses Obsidian's textarea component and Vault API. It keeps
the card mounted and the feed stationary while editing, permits only one open
editor, and writes only after an explicit save. If the note changed elsewhere
after Quick Edit opened, the save is refused instead of overwriting that newer
content.

## Excluded folders

Open **Settings → Community plugins → Obsidian Doom Scroll** to exclude noisy
folders such as chat histories, generated notes, or templates. Every excluded
folder has its own **Also exclude subfolders** toggle and can be removed without
affecting vault files.

Exclusions apply to folder, tag, outgoing-link, and backlink feeds. They are not
applied to the custom Bases layout because a Base's visible filters, sorting,
and limits remain authoritative. Settings are stored locally in Obsidian's
normal plugin data and no note or Base file is modified.

## Mobile behavior and local deployment

The runtime uses only Obsidian's cross-platform APIs and browser APIs available
in Obsidian mobile. It has no Node.js filesystem or Electron dependency. Touch
targets are at least 44 pixels on mobile, the feed uses native momentum
scrolling, and editing always hands the note back to Obsidian's normal editor.

For direct desktop and Obsidian Sync testing, place this repository at
`.obsidian/plugins/obsidian-doom-scroll`. Run `npm run build`; the loadable
artifacts are `main.js`, `manifest.json`, and `styles.css` in that directory.

## Known limitations

- Obsidian's public API does not expose a supported way to execute an arbitrary
  Base query headlessly. Doom Scroll therefore integrates as a registered Base
  view and consumes the result set that Obsidian supplies there.
- Grouped Base results are shown as one ordered feed; group headings are not
  rendered in version 0.1.0.
- Feed history and Base snapshots are deliberately in memory only and are not
  restored after restarting Obsidian.
- Interactive verification must be performed separately on desktop and mobile;
  automated checks cover source ordering, context history, type safety, linting,
  and production bundling.

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
