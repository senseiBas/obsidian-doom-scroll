import {
	FuzzySuggestModal,
	Notice,
	TFolder,
	type App,
	type TFile,
} from 'obsidian';
import { orderFolderFiles } from '../feed-sources/folder-order';
import type { FolderFeedState } from '../types/feed';

type FolderScopeChoice = {
	label: string;
	state: FolderFeedState;
};

export class FolderPickerModal extends FuzzySuggestModal<TFolder> {
	constructor(
		app: App,
		private readonly onChoose: (state: FolderFeedState) => void,
	) {
		super(app);
		this.setPlaceholder('Choose a folder for doom scroll…');
	}

	getItems(): TFolder[] {
		return this.app.vault
			.getAllLoadedFiles()
			.filter((file): file is TFolder => file instanceof TFolder)
			.sort((left, right) =>
				left.path.localeCompare(right.path, 'en', {
					numeric: true,
					sensitivity: 'base',
				}),
			);
	}

	getItemText(folder: TFolder): string {
		return folder.isRoot() ? 'Vault root' : folder.path;
	}

	onChooseItem(folder: TFolder): void {
		openFolderScopePicker(this.app, folder, this.onChoose);
	}
}

export function openFolderScopePicker(
	app: App,
	folder: TFolder,
	onChoose: (state: FolderFeedState) => void,
): void {
	const choices = buildFolderScopeChoices(app, folder.path);
	if (choices.length === 0) {
		new Notice('This folder contains no Markdown notes.');
		return;
	}
	new FolderScopeModal(app, choices, onChoose).open();
}

class FolderScopeModal extends FuzzySuggestModal<FolderScopeChoice> {
	constructor(
		app: App,
		private readonly choices: FolderScopeChoice[],
		private readonly onChoose: (state: FolderFeedState) => void,
	) {
		super(app);
		this.setPlaceholder('Choose how much of the folder to include…');
	}

	getItems(): FolderScopeChoice[] {
		return this.choices;
	}

	getItemText(choice: FolderScopeChoice): string {
		return choice.label;
	}

	onChooseItem(choice: FolderScopeChoice): void {
		this.onChoose(choice.state);
	}
}

function buildFolderScopeChoices(
	app: App,
	folderPath: string,
): FolderScopeChoice[] {
	const files = app.vault.getMarkdownFiles();
	return [
		buildFolderScopeChoice(files, folderPath, false),
		buildFolderScopeChoice(files, folderPath, true),
	].filter((choice): choice is FolderScopeChoice => choice !== null);
}

function buildFolderScopeChoice(
	files: readonly TFile[],
	folderPath: string,
	recursive: boolean,
): FolderScopeChoice | null {
	const orderedFiles = orderFolderFiles(files, folderPath, recursive);
	const anchor = orderedFiles[0];
	if (!anchor) {
		return null;
	}
	return {
		label: recursive ? 'Folder + subfolders' : 'This folder only',
		state: {
			source: 'folder',
			anchorPath: anchor.path,
			recursive,
		},
	};
}
