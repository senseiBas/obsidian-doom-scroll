import type { App, TFile } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';
import { TextSearchIndex } from '../src/search/text-search-index';

type MutableTestFile = TFile & {
	stat: { mtime: number; ctime: number; size: number };
};

function createFile(path: string, mtime = 1): MutableTestFile {
	const name = path.slice(path.lastIndexOf('/') + 1);
	return {
		path,
		name,
		basename: name.replace(/\.md$/u, ''),
		extension: 'md',
		stat: { mtime, ctime: 1, size: 10 },
	} as MutableTestFile;
}

describe('TextSearchIndex', () => {
	it('searches titles and content, then reuses unchanged cached reads', async () => {
		const files = [
			createFile('notes/Quality.md'),
			createFile('notes/Performance plan.md'),
			createFile('notes/Load testing.md'),
		];
		const contents = new Map([
			['notes/Quality.md', 'Performance and quality'],
			['notes/Performance plan.md', 'Planning'],
			['notes/Load testing.md', 'No matching phrase'],
		]);
		const cachedRead = vi.fn(async (file: TFile) => {
			return contents.get(file.path) ?? '';
		});
		const app = {
			vault: {
				getMarkdownFiles: () => files,
				cachedRead,
			},
		} as unknown as App;
		const index = new TextSearchIndex(app);

		const first = await index.search('performance', []);
		expect(first.map((file) => file.path)).toEqual([
			'notes/Performance plan.md',
			'notes/Quality.md',
		]);
		expect(cachedRead).toHaveBeenCalledTimes(2);

		await index.search('quality', []);
		expect(cachedRead).toHaveBeenCalledTimes(3);
	});

	it('re-reads a changed file and respects absolute folder exclusions', async () => {
		const included = createFile('notes/Current plan.md');
		const excluded = createFile('archive/Old plan.md');
		const files = [included, excluded];
		const contents = new Map([
			[included.path, 'Initial content'],
			[excluded.path, 'Performance'],
		]);
		const cachedRead = vi.fn(async (file: TFile) => {
			return contents.get(file.path) ?? '';
		});
		const app = {
			vault: {
				getMarkdownFiles: () => files,
				cachedRead,
			},
		} as unknown as App;
		const index = new TextSearchIndex(app);

		await index.search('performance', [
			{ path: 'archive', includeSubfolders: true },
		]);
		expect(cachedRead).toHaveBeenCalledTimes(1);

		included.stat.mtime = 2;
		contents.set(included.path, 'Performance after update');
		const updated = await index.search('performance', [
			{ path: 'archive', includeSubfolders: true },
		]);
		expect(updated.map((file) => file.path)).toEqual([included.path]);
		expect(cachedRead).toHaveBeenCalledTimes(2);
	});
});
