import { describe, expect, it } from 'vitest';
import { BaseContextRegistry } from '../src/bases/base-context-registry';

describe('BaseContextRegistry', () => {
	it('preserves the exact result order in a defensive snapshot', () => {
		const registry = new BaseContextRegistry();
		const paths = ['third.md', 'first.md', 'second.md'];
		const state = registry.create('Example', paths, 'first.md');

		paths.reverse();
		expect(registry.get(state.contextId)).toEqual({
			label: 'Example',
			paths: ['third.md', 'first.md', 'second.md'],
		});
	});

	it('updates renamed paths without changing their position', () => {
		const registry = new BaseContextRegistry();
		const state = registry.create(
			'Example',
			['one.md', 'folder/two.md'],
			'folder/two.md',
		);

		registry.renamePath('folder/two.md', 'folder/renamed.md');
		expect(registry.get(state.contextId)?.paths).toEqual([
			'one.md',
			'folder/renamed.md',
		]);
	});
});
