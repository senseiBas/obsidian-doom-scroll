import {
	getAllTags,
	getLinkpath,
	type App,
	type ReferenceCache,
	type TFile,
} from 'obsidian';
import type {
	DoomScrollViewState,
	LinkFeedState,
	ResolvedFeed,
	TagFeedState,
} from '../types/feed';
import {
	orderVaultFilesNaturally,
} from './folder-order';
import { resolveBacklinkPaths, resolveOutgoingPaths } from './link-order';
import { hasExactTag } from './tag-match';

export function getExactTags(app: App, file: TFile): string[] {
	const cache = app.metadataCache.getFileCache(file);
	const tags = cache ? (getAllTags(cache) ?? []) : [];
	return Array.from(new Set(tags)).sort((left, right) =>
		left.localeCompare(right, 'en', { sensitivity: 'base' }),
	);
}

export function resolveRelatedFeed(
	app: App,
	state: LinkFeedState | TagFeedState,
): ResolvedFeed | null {
	const anchor = app.vault.getFileByPath(state.anchorPath);
	if (!anchor || anchor.extension.toLocaleLowerCase() !== 'md') {
		return null;
	}

	const files =
		state.source === 'outgoing'
			? resolveOutgoingFiles(app, anchor)
			: state.source === 'backlinks'
				? resolveBacklinkFiles(app, anchor)
				: resolveTagFiles(app, anchor, state.tag);
	const anchorIndex = files.findIndex((file) => file.path === anchor.path);

	return anchorIndex < 0 ? null : { files, anchorIndex, state };
}

function resolveOutgoingFiles(app: App, anchor: TFile): TFile[] {
	const cache = app.metadataCache.getFileCache(anchor);
	const references: ReferenceCache[] = [
		...(cache?.links ?? []),
		...(cache?.embeds ?? []),
	];
	const paths = resolveOutgoingPaths(anchor.path, references, (link) => {
		return (
			app.metadataCache.getFirstLinkpathDest(
				getLinkpath(link),
				anchor.path,
			)?.path ?? null
		);
	});

	return paths
		.map((path) => app.vault.getFileByPath(path))
		.filter((file): file is TFile => file?.extension === 'md');
}

function resolveBacklinkFiles(app: App, anchor: TFile): TFile[] {
	const filesByPath = new Map<string, TFile>();
	for (const sourcePath of resolveBacklinkPaths(
		anchor.path,
		app.metadataCache.resolvedLinks,
	)) {
		const sourceFile = app.vault.getFileByPath(sourcePath);
		if (sourceFile?.extension === 'md') {
			filesByPath.set(sourceFile.path, sourceFile);
		}
	}

	return orderVaultFilesNaturally(Array.from(filesByPath.values()));
}

function resolveTagFiles(app: App, anchor: TFile, tag: string): TFile[] {
	const filesByPath = new Map<string, TFile>([[anchor.path, anchor]]);
	for (const file of app.vault.getMarkdownFiles()) {
		if (hasExactTag(getExactTags(app, file), tag)) {
			filesByPath.set(file.path, file);
		}
	}

	return orderVaultFilesNaturally(Array.from(filesByPath.values()));
}

export function describeFeedSource(state: DoomScrollViewState): string {
	switch (state.source) {
		case 'folder':
			return state.recursive ? 'Folder + subfolders' : 'Folder';
		case 'outgoing':
			return 'Outgoing links';
		case 'backlinks':
			return 'Backlinks';
		case 'tag':
			return `Tag ${state.tag}`;
		case 'base':
			return `Base: ${state.label}`;
		case 'text':
			return `Text: “${state.query}”`;
	}
}
