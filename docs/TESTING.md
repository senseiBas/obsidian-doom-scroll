# Manual test protocol

Run `npm run check` before starting. Obsidian should load `main.js`,
`manifest.json`, and `styles.css` from
`.obsidian/plugins/obsidian-doom-scroll`.

## Desktop

1. Enable Obsidian Doom Scroll in **Settings → Community plugins**.
2. Open a Markdown note and start a feed from the ribbon, command palette,
   file menu, and editor menu.
3. Verify direct-folder and recursive-folder feeds. The selected note should be
   the initial anchor, with notes available above and below in natural filename
   order. Repeat with a root-level note.
4. Verify outgoing-link order follows document order and does not duplicate a
   linked note. Verify backlinks and exact-tag feeds use natural filename order.
5. Scroll through a large result set. Inspect that only nearby notes are present
   in the DOM and that images loading above the viewport do not cause a large
   jump.
6. Click an internal link. Test opening normally and branching to every
   available feed source. Confirm external links retain Obsidian's normal
   behavior.
   Hold Ctrl (Cmd on macOS) while hovering the internal link and confirm
   Obsidian's native Page preview appears in both ordinary and Base feeds.
7. Use Back and Forward after scrolling and branching. Confirm each feed returns
   to approximately its previous position and that a new branch clears Forward.
8. Use **Open**, the global **Exit feed** button, and the **Exit feed to anchor
   note** command. Exiting should open the exact note in source mode with focus
   and the cursor at the end.
   Ctrl+click **Open** on several cards (Cmd+click on macOS). Confirm every note
   appears in its own background tab while Doom Scroll keeps focus and its exact
   scroll position. Repeat in a Base feed.
9. Rename and delete both anchor and non-anchor files while a feed is open.
   Confirm the feed refreshes or shows a clear unavailable-anchor message.
10. Open a Base containing filtered, sorted, and limited views. Select the
    **Doom scroll** layout and confirm its notes exactly match the supplied Base
    result order. Change the Base filter, sort, and limit and confirm the feed
    updates.
11. In the Base feed, follow a link to another included result using
    **Doom scroll: Current Base view**. Also branch to another source and verify
    Back returns to the Base ordering.
12. Disable and re-enable the plugin after using several feeds. Confirm there
    are no stale panes, duplicated listeners, or broken Base layouts.
13. Click a rendered tag and test both **Open tag normally** and its exact-tag
    Doom Scroll feed.
14. Add direct-only and recursive exclusions in the plugin settings. Verify
    excluded notes disappear from every ordinary source while custom Base views
    keep their exact supplied results. Rename and delete an excluded folder and
    verify the settings follow or remove it.
15. Choose **Quick edit** on desktop. Verify the card changes into a raw
    Markdown textarea, focus starts at the end, the feed itself cannot scroll,
    and a second card cannot enter Quick Edit at the same time.
16. Change text and test **Cancel**, **Save**, and **Save & open full editor**.
    Cancel must not write; Save must return to the rendered card; Save & open
    must save first and then open Obsidian's source editor at the end.
17. While Quick Edit is open, change the same note from another Obsidian pane,
    then try to save the Quick Edit draft. Confirm a conflict notice appears,
    the newer file is not overwritten, and the draft remains available in the
    textarea.
18. Select `performance` in a Markdown editor. Start **Doom scroll notes
    containing “performance”** from the editor context menu and repeat through
    the command palette. Confirm filename and content matches are included
    case-insensitively, excluded folders stay absent, and the source note is the
    initial anchor.
19. Confirm every visible occurrence in rendered text and card titles is
    highlighted. Follow links, use Back/Forward, Quick Edit a result, and
    Ctrl+click several **Open** buttons; the text-search feed and highlighting
    should remain intact when returning.
20. Repeat the same search. Confirm it finishes faster from the in-memory cache,
    then modify one matching and one non-matching note and verify a new search
    reflects both changes.

## Android

1. Let Obsidian Sync finish syncing the plugin folder, including `main.js`,
   `manifest.json`, and `styles.css`, then enable the plugin.
2. Repeat folder, link, tag, and Base smoke tests using touch only.
3. Confirm vertical momentum scrolling feels native and no horizontal toolbar
   overflow appears in portrait orientation.
4. Verify the 44-pixel touch targets, internal-link junction, Back/Forward, and
   both exit paths.
5. Test notes containing images, embeds, tables, task lists, callouts, and code
   blocks through Obsidian's normal renderer.
6. Choose **Edit / exit here** and confirm Obsidian's mobile editor opens the
   exact note with the cursor at its end and the keyboard ready for input.
7. Background and resume Obsidian while a feed is open, then repeat a long
   scroll to check for blank cards, jumps, or crashes.
8. Select text in the mobile editor, run **Doom scroll: Open feed for selected
   text** from the command palette, and confirm matching notes and highlights
   appear without a crash or long UI freeze.

Record the Obsidian version, Android version, vault size, feed source, and exact
reproduction steps for every issue.
