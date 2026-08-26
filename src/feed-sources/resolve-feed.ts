import type { App } from 'obsidian';
import type { DoomScrollViewState, ResolvedFeed } from '../types/feed';
import type { BaseContextRegistry } from '../bases/base-context-registry';
import { resolveBaseFeed } from './base-feed-source';
import { resolveFolderFeed } from './folder-feed-source';
import { resolveRelatedFeed } from './related-feed-source';

export function resolveFeed(
	app: App,
	state: DoomScrollViewState,
	baseContexts: BaseContextRegistry,
): ResolvedFeed | null {
	if (state.source === 'folder') {
		return resolveFolderFeed(app, state);
	}
	if (state.source === 'base') {
		return resolveBaseFeed(app, state, baseContexts);
	}
	return resolveRelatedFeed(app, state);
}
