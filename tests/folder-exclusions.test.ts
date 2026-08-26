import { describe, expect, it } from 'vitest';
import {
	filterExcludedFiles,
	isFileExcluded,
	removeDeletedFolderPaths,
	renameExcludedFolderPaths,
} from '../src/feed-sources/folder-exclusions';

describe('folder exclusions', () => {
	it('can exclude only direct files in a folder', () => {
		const rules = [{ path: 'copilot', includeSubfolders: false }];
		expect(isFileExcluded('copilot/chat.md', rules)).toBe(true);
		expect(isFileExcluded('copilot/archive/chat.md', rules)).toBe(false);
	});

	it('can exclude a folder and all of its descendants', () => {
		const rules = [{ path: 'AI history', includeSubfolders: true }];
		expect(isFileExcluded('AI history/log.md', rules)).toBe(true);
		expect(isFileExcluded('AI history/2026/log.md', rules)).toBe(true);
		expect(isFileExcluded('AI history-old/log.md', rules)).toBe(false);
	});

	it('supports root-only and whole-vault exclusions', () => {
		expect(
			isFileExcluded('Root.md', [{ path: '', includeSubfolders: false }]),
		).toBe(true);
		expect(
			isFileExcluded('notes/Nested.md', [
				{ path: '', includeSubfolders: false },
			]),
		).toBe(false);
		expect(
			isFileExcluded('notes/Nested.md', [
				{ path: '', includeSubfolders: true },
			]),
		).toBe(true);
	});

	it('tracks renamed and deleted excluded folder trees', () => {
		const rules = [
			{ path: 'old', includeSubfolders: true },
			{ path: 'old/nested', includeSubfolders: false },
			{ path: 'other', includeSubfolders: true },
		];
		const renamed = renameExcludedFolderPaths(rules, 'old', 'new');
		expect(renamed.map((rule) => rule.path)).toEqual([
			'new',
			'new/nested',
			'other',
		]);
		expect(removeDeletedFolderPaths(renamed, 'new')).toEqual([
			{ path: 'other', includeSubfolders: true },
		]);
	});

	it('filters a feed without changing the remaining order', () => {
		const result = filterExcludedFiles(
			[
				{ path: 'notes/Anchor.md' },
				{ path: 'templates/Hidden.md' },
				{ path: 'notes/Last.md' },
			],
			'notes/Anchor.md',
			[{ path: 'templates', includeSubfolders: true }],
		);
		expect(result).toEqual({
			files: [
				{ path: 'notes/Anchor.md' },
				{ path: 'notes/Last.md' },
			],
			anchorIndex: 0,
		});
	});

	it('rejects a feed whose anchor is excluded', () => {
		expect(
			filterExcludedFiles(
				[{ path: 'templates/Anchor.md' }],
				'templates/Anchor.md',
				[{ path: 'templates', includeSubfolders: true }],
			),
		).toBeNull();
	});
});
