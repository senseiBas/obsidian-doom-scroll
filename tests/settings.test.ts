import { describe, expect, it } from 'vitest';
import { normalizeSettings } from '../src/settings';

describe('normalizeSettings', () => {
	it('keeps valid unique rules and normalizes folder paths', () => {
		expect(
			normalizeSettings({
				excludedFolders: [
					{ path: '/templates/', includeSubfolders: true },
					{ path: 'templates', includeSubfolders: false },
					{ path: 'copilot', includeSubfolders: false },
				],
			}),
		).toEqual({
			excludedFolders: [
				{ path: 'templates', includeSubfolders: true },
				{ path: 'copilot', includeSubfolders: false },
			],
		});
	});

	it('drops malformed stored values', () => {
		expect(
			normalizeSettings({
				excludedFolders: [
					null,
					{ path: 42, includeSubfolders: true },
					{ path: 'valid', includeSubfolders: false },
				],
			}),
		).toEqual({
			excludedFolders: [
				{ path: 'valid', includeSubfolders: false },
			],
		});
	});
});
