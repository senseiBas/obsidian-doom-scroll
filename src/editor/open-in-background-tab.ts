import type { App, TFile } from 'obsidian';

export async function openFileInBackgroundTab(
	app: App,
	file: TFile,
): Promise<void> {
	await app.workspace.openLinkText(file.path, '', 'tab', {
		active: false,
	});
}
