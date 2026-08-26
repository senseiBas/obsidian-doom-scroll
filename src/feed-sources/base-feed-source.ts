import type { App, TFile } from 'obsidian';
import type { BaseContextRegistry } from '../bases/base-context-registry';
import type { BaseFeedState, ResolvedFeed } from '../types/feed';

export function resolveBaseFeed(
	app: App,
	state: BaseFeedState,
	contexts: BaseContextRegistry,
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
