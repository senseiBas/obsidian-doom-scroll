import type { App } from 'obsidian';
import type { DoomScrollViewState, ResolvedFeed } from '../types/feed';
import { resolveFolderFeed } from './folder-feed-source';
import { resolveRelatedFeed } from './related-feed-source';

export function resolveFeed(
	app: App,
	state: DoomScrollViewState,
): ResolvedFeed | null {
	return state.source === 'folder'
		? resolveFolderFeed(app, state)
		: resolveRelatedFeed(app, state);
}
