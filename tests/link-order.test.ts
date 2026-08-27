import { describe, expect, it } from 'vitest';
import {
	resolveBacklinkPaths,
	resolveOutgoingPaths,
	type PositionedLink,
} from '../src/feed-sources/link-order';

function link(target: string, offset: number): PositionedLink {
	return { link: target, position: { start: { offset } } };
}

describe('resolveOutgoingPaths', () => {
	it('keeps source order after the anchor and removes duplicates', () => {
		const references = [
			link('Third', 30),
			link('First', 10),
			link('First alias', 20),
		];
		const targets: Record<string, string> = {
			First: 'First.md',
			'First alias': 'First.md',
			Third: 'Third.md',
		};

		expect(
			resolveOutgoingPaths(
				'Anchor.md',
				references,
				(value) => targets[value] ?? null,
			),
		).toEqual(['Anchor.md', 'First.md', 'Third.md']);
	});

	it('skips unresolved and self-referential links', () => {
		const references = [link('Missing', 1), link('Self', 2)];
		expect(
			resolveOutgoingPaths('Anchor.md', references, (value) =>
				value === 'Self' ? 'Anchor.md' : null,
			),
		).toEqual(['Anchor.md']);
	});

	it('appends resolved destinations missing from the reference cache', () => {
		const references = [link('First', 10)];
		expect(
			resolveOutgoingPaths(
				'Anchor.md',
				references,
				(value) => (value === 'First' ? 'First.md' : null),
				['First.md', 'Recovered.md'],
			),
		).toEqual(['Anchor.md', 'First.md', 'Recovered.md']);
	});
});

describe('resolveBacklinkPaths', () => {
	it('includes the anchor and each resolved source once', () => {
		const resolved = {
			'One.md': { 'Anchor.md': 2 },
			'Two.md': { 'Other.md': 1 },
			'Anchor.md': { 'Anchor.md': 1 },
		};
		expect(resolveBacklinkPaths('Anchor.md', resolved)).toEqual([
			'Anchor.md',
			'One.md',
		]);
	});
});
