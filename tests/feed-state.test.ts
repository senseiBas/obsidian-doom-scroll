import { describe, expect, it } from 'vitest';
import { isDoomScrollViewState } from '../src/types/feed';

describe('isDoomScrollViewState', () => {
	it('accepts an in-memory Base context', () => {
		expect(
			isDoomScrollViewState({
				source: 'base',
				anchorPath: 'notes/anchor.md',
				contextId: 'base-1',
				label: 'Index',
			}),
		).toBe(true);
	});

	it('rejects incomplete Base contexts', () => {
		expect(
			isDoomScrollViewState({
				source: 'base',
				anchorPath: 'notes/anchor.md',
				contextId: '',
				label: 'Index',
			}),
		).toBe(false);
	});

	it('accepts a valid in-memory text-search context', () => {
		expect(
			isDoomScrollViewState({
				source: 'text',
				anchorPath: 'notes/performance.md',
				contextId: 'text-1',
				query: 'performance',
			}),
		).toBe(true);
	});

	it('rejects text-search contexts without a query', () => {
		expect(
			isDoomScrollViewState({
				source: 'text',
				anchorPath: 'notes/performance.md',
				contextId: 'text-1',
				query: '',
			}),
		).toBe(false);
	});
});
