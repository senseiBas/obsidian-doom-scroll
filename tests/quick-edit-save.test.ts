import { describe, expect, it } from 'vitest';
import { decideQuickEditSave } from '../src/editor/quick-edit-save';

describe('decideQuickEditSave', () => {
	it('skips a write when the draft is unchanged', () => {
		expect(decideQuickEditSave('same', 'same', 'same')).toBe('unchanged');
	});

	it('does not overwrite an external change when the draft is unchanged', () => {
		expect(decideQuickEditSave('before', 'external', 'before')).toBe(
			'unchanged',
		);
	});

	it('allows a changed draft when the source snapshot is still current', () => {
		expect(decideQuickEditSave('before', 'before', 'after')).toBe('save');
	});

	it('detects an external modification instead of overwriting it', () => {
		expect(decideQuickEditSave('before', 'external', 'draft')).toBe(
			'conflict',
		);
	});
});
