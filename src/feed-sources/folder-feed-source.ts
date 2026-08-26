import type { App, TFile } from 'obsidian';
import { orderFolderFeed } from './folder-order';
import type { FolderFeedState, ResolvedFeed } from '../types/feed';

export function resolveFolderFeed(
	app: App,
	state: FolderFeedState,
): ResolvedFeed | null {
	const anchor = app.vault.getFileByPath(state.anchorPath);
	if (!anchor || anchor.extension.toLocaleLowerCase() !== 'md') {
		return null;
	}

	const result = orderFolderFeed<TFile>(
		app.vault.getMarkdownFiles(),
		anchor.path,
		state.recursive,
	);

	if (result.anchorIndex < 0) {
		return null;
	}

	return {
		files: result.files,
		anchorIndex: result.anchorIndex,
		state,
	};
}
