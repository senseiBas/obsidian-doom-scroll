import { describe, expect, it } from 'vitest';
import { hasExactTag } from '../src/feed-sources/tag-match';
import { normalizeRenderedTag } from '../src/feed-sources/tag-link';

describe('hasExactTag', () => {
	it('matches only the selected tag and not nested tags', () => {
		expect(hasExactTag(['#project', '#other'], '#project')).toBe(true);
		expect(hasExactTag(['#project/alpha'], '#project')).toBe(false);
	});
});

describe('normalizeRenderedTag', () => {
	it('normalizes rendered hrefs and visible tags', () => {
		expect(normalizeRenderedTag('#project/active')).toBe('#project/active');
		expect(normalizeRenderedTag('%23project')).toBe('#project');
		expect(normalizeRenderedTag('  project  ')).toBe('#project');
	});

	it('rejects empty tag targets', () => {
		expect(normalizeRenderedTag(null)).toBeNull();
		expect(normalizeRenderedTag('###')).toBeNull();
	});
});
