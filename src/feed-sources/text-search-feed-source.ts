import type { App, TFile } from 'obsidian';
import type { TextSearchContextRegistry } from '../search/text-search-context-registry';
import type { ResolvedFeed, TextSearchFeedState } from '../types/feed';

export function resolveTextSearchFeed(
	app: App,
	state: TextSearchFeedState,
	contexts: TextSearchContextRegistry,
): ResolvedFeed | null {
	const context = contexts.get(state.contextId);
	if (!context) {
		return null;
	}

	const files = context.paths
		.map((path) => app.vault.getFileByPath(path))
		.filter(
			(file): file is TFile =>
				file?.extension.toLocaleLowerCase() === 'md',
		);
	const anchorIndex = files.findIndex(
		(file) => file.path === state.anchorPath,
	);
	return anchorIndex < 0 ? null : { files, anchorIndex, state };
}
