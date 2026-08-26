import type { TFile } from 'obsidian';

export type FolderFeedState = {
	source: 'folder';
	anchorPath: string;
	recursive: boolean;
};

export type LinkFeedState =
	| { source: 'outgoing'; anchorPath: string }
	| { source: 'backlinks'; anchorPath: string };

export type TagFeedState = {
	source: 'tag';
	anchorPath: string;
	tag: string;
};

export type DoomScrollViewState =
	| FolderFeedState
	| LinkFeedState
	| TagFeedState;

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
	if (typeof candidate.anchorPath !== 'string') {
		return false;
	}

	switch (candidate.source) {
		case 'folder':
			return typeof candidate.recursive === 'boolean';
		case 'outgoing':
		case 'backlinks':
			return true;
		case 'tag':
			return typeof candidate.tag === 'string' && candidate.tag.length > 0;
		default:
			return false;
	}
}
