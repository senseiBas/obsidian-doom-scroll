import { describe, expect, it } from 'vitest';
import {
	containsSearchQuery,
	normalizeSearchQuery,
	splitTextMatches,
} from '../src/search/text-match';

describe('text search matching', () => {
	it('normalizes selected whitespace without changing display casing', () => {
		expect(normalizeSearchQuery('  Performance\n  Testing ')).toBe(
			'Performance Testing',
		);
		expect(normalizeSearchQuery(' \n\t ')).toBeNull();
	});

	it('matches an exact phrase case-insensitively in title or content', () => {
		expect(containsSearchQuery('Performance plan', '', 'performance')).toBe(
			true,
		);
		expect(
			containsSearchQuery(
				'Quality',
				'Performance\n testing findings',
				'performance testing',
			),
		).toBe(true);
		expect(containsSearchQuery('Quality', 'Testing only', 'performance')).toBe(
			false,
		);
	});

	it('splits every literal case-insensitive match for highlighting', () => {
		expect(splitTextMatches('Performance and PERFORMANCE', 'performance')).toEqual(
			[
				{ text: 'Performance', match: true },
				{ text: ' and ', match: false },
				{ text: 'PERFORMANCE', match: true },
			],
		);
	});

	it('highlights phrases across rendered whitespace and treats punctuation literally', () => {
		expect(splitTextMatches('Performance\n testing (v2)', 'performance testing (v2)')).toEqual(
			[{ text: 'Performance\n testing (v2)', match: true }],
		);
	});
});
