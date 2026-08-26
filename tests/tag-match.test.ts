import { describe, expect, it } from 'vitest';
import { hasExactTag } from '../src/feed-sources/tag-match';

describe('hasExactTag', () => {
	it('matches only the selected tag and not nested tags', () => {
		expect(hasExactTag(['#project', '#other'], '#project')).toBe(true);
		expect(hasExactTag(['#project/alpha'], '#project')).toBe(false);
	});
});
