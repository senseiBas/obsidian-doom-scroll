import type { App } from 'obsidian';
import type { DoomScrollViewState, ResolvedFeed } from '../types/feed';
import type { BaseContextRegistry } from '../bases/base-context-registry';
import type { TextSearchContextRegistry } from '../search/text-search-context-registry';
import type { ExcludedFolderRule } from '../settings';
import { resolveBaseFeed } from './base-feed-source';
import { filterExcludedFiles } from './folder-exclusions';
import { resolveFolderFeed } from './folder-feed-source';
import { resolveRelatedFeed } from './related-feed-source';
import { resolveTextSearchFeed } from './text-search-feed-source';

export function resolveFeed(
	app: App,
	state: DoomScrollViewState,
	baseContexts: BaseContextRegistry,
	textSearchContexts: TextSearchContextRegistry,
	excludedFolders: readonly ExcludedFolderRule[],
): ResolvedFeed | null {
	if (state.source === 'base') {
		return resolveBaseFeed(app, state, baseContexts);
	}
	if (state.source === 'text') {
		const resolved = resolveTextSearchFeed(app, state, textSearchContexts);
		if (!resolved) {
			return null;
		}
		const filtered = filterExcludedFiles(
			resolved.files,
			state.anchorPath,
			excludedFolders,
		);
		return filtered ? { ...resolved, ...filtered } : null;
	}
	const resolved =
		state.source === 'folder'
			? resolveFolderFeed(app, state)
			: resolveRelatedFeed(app, state);
	if (!resolved) {
		return null;
	}
	const filtered = filterExcludedFiles(
		resolved.files,
		state.anchorPath,
		excludedFolders,
	);
	return filtered ? { ...resolved, ...filtered } : null;
}
