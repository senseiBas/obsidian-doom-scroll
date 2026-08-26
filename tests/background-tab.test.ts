import { describe, expect, it, vi } from 'vitest';
import type { App, TFile } from 'obsidian';
import { openFileInBackgroundTab } from '../src/editor/open-in-background-tab';

describe('openFileInBackgroundTab', () => {
	it('opens a new tab without activating it', async () => {
		const openLinkText = vi.fn().mockResolvedValue(undefined);
		const app = {
			workspace: { openLinkText },
		} as unknown as App;
		const file = { path: 'Review/candidate.md' } as TFile;

		await openFileInBackgroundTab(app, file);

		expect(openLinkText).toHaveBeenCalledWith(
			'Review/candidate.md',
			'',
			'tab',
			{ active: false },
		);
	});
});
