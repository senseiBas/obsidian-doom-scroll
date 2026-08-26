import { MarkdownView, type TFile, type WorkspaceLeaf } from 'obsidian';

export async function openFileNormally(
	leaf: WorkspaceLeaf,
	file: TFile,
): Promise<void> {
	await leaf.openFile(file, { active: true });
}

export async function openFileForEditing(
	leaf: WorkspaceLeaf,
	file: TFile,
): Promise<void> {
	await leaf.openFile(file, {
		active: true,
		state: { mode: 'source' },
	});
	await leaf.loadIfDeferred();

	if (!(leaf.view instanceof MarkdownView)) {
		return;
	}

	const { editor } = leaf.view;
	const lastLine = editor.lastLine();
	editor.setCursor({
		line: lastLine,
		ch: editor.getLine(lastLine).length,
	});
	editor.focus();
}
