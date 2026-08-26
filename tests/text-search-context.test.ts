import { describe, expect, it } from 'vitest';
import { TextSearchContextRegistry } from '../src/search/text-search-context-registry';

describe('TextSearchContextRegistry', () => {
	it('keeps a defensive snapshot and follows file renames', () => {
		const registry = new TextSearchContextRegistry();
		const paths = ['one.md', 'two.md'];
		const state = registry.create('performance', paths, 'one.md');
		paths.push('outside.md');

		registry.renamePath('two.md', 'renamed.md');

		expect(registry.get(state.contextId)).toEqual({
			query: 'performance',
			paths: ['one.md', 'renamed.md'],
		});
	});
});
