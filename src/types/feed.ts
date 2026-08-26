import type { TFile } from 'obsidian';

export type FolderFeedState = {
	source: 'folder';
	anchorPath: string;
	recursive: boolean;
};

export type DoomScrollViewState = FolderFeedState;

export type ResolvedFeed = {
	files: TFile[];
	anchorIndex: number;
	state: DoomScrollViewState;
};

export function isDoomScrollViewState(
	value: unknown,
): value is DoomScrollViewState {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const candidate = value as Partial<DoomScrollViewState>;
	return (
		candidate.source === 'folder' &&
		typeof candidate.anchorPath === 'string' &&
		typeof candidate.recursive === 'boolean'
	);
}
