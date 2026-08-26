import { describe, expect, it } from 'vitest';
import manifest from '../manifest.json';

describe('plugin manifest', () => {
	it('uses the permanent community plugin identity', () => {
		expect(manifest.id).toBe('obsidian-doom-scroll');
		expect(manifest.name).toBe('Obsidian Doom Scroll');
	});

	it('declares cross-platform support', () => {
		expect(manifest.isDesktopOnly).toBe(false);
		expect(manifest.minAppVersion).toBe('1.10.0');
	});

	it('does not advertise a funding URL before one is configured', () => {
		expect(manifest).not.toHaveProperty('fundingUrl');
	});
});
