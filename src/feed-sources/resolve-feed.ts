import type { App } from 'obsidian';
import type { DoomScrollViewState, ResolvedFeed } from '../types/feed';
import type { BaseContextRegistry } from '../bases/base-context-registry';
import type { ExcludedFolderRule } from '../settings';
import { resolveBaseFeed } from './base-feed-source';
import { filterExcludedFiles } from './folder-exclusions';
import { resolveFolderFeed } from './folder-feed-source';
import { resolveRelatedFeed } from './related-feed-source';

export function resolveFeed(
	app: App,
	state: DoomScrollViewState,
	baseContexts: BaseContextRegistry,
	excludedFolders: readonly ExcludedFolderRule[],
): ResolvedFeed | null {
	if (state.source === 'base') {
		return resolveBaseFeed(app, state, baseContexts);
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
