import { describe, expect, it } from 'vitest';
import {
	orderFolderFeed,
	orderFolderFiles,
	type VaultFileDescriptor,
} from '../src/feed-sources/folder-order';

function file(path: string): VaultFileDescriptor {
	const name = path.split('/').at(-1) ?? path;
	const extension = name.includes('.') ? (name.split('.').at(-1) ?? '') : '';
	const basename = name.slice(0, -(extension.length + 1));
	return { path, basename, extension };
}

describe('orderFolderFeed', () => {
	it('keeps a root feed in the root unless recursion is requested', () => {
		const files = [
			file('Home.md'),
			file('10 Notes.md'),
			file('2 Notes.md'),
			file('notes/Nested.md'),
		];

		const direct = orderFolderFeed(files, 'Home.md', false);
		expect(direct.files.map((item) => item.path)).toEqual([
			'2 Notes.md',
			'10 Notes.md',
			'Home.md',
		]);
		expect(direct.anchorIndex).toBe(2);

		const recursive = orderFolderFeed(files, 'Home.md', true);
		expect(recursive.files.map((item) => item.path)).toContain(
			'notes/Nested.md',
		);
	});

	it('limits a direct nested feed to sibling Markdown files', () => {
		const files = [
			file('notes/Anchor.md'),
			file('notes/Other.md'),
			file('notes/deeper/Child.md'),
			file('notes/Attachment.pdf'),
		];

		const result = orderFolderFeed(files, 'notes/Anchor.md', false);
		expect(result.files.map((item) => item.path)).toEqual([
			'notes/Anchor.md',
			'notes/Other.md',
		]);
		expect(result.anchorIndex).toBe(0);
	});

	it('returns an empty result when the anchor no longer exists', () => {
		const result = orderFolderFeed([file('Existing.md')], 'Missing.md', false);
		expect(result).toEqual({ files: [], anchorIndex: -1 });
	});

	it('selects an arbitrary folder without requiring an existing anchor', () => {
		const files = [
			file('chosen/10 Note.md'),
			file('chosen/2 Note.md'),
			file('chosen/nested/Child.md'),
			file('other/Outside.md'),
		];

		expect(
			orderFolderFiles(files, 'chosen', false).map((item) => item.path),
		).toEqual(['chosen/2 Note.md', 'chosen/10 Note.md']);
		expect(
			orderFolderFiles(files, 'chosen', true).map((item) => item.path),
		).toEqual([
			'chosen/2 Note.md',
			'chosen/10 Note.md',
			'chosen/nested/Child.md',
		]);
	});
});
