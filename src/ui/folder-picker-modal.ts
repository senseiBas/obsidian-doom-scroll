import {
	FuzzySuggestModal,
	Notice,
	type App,
	type TFile,
	type TFolder,
} from 'obsidian';
import { orderFolderFiles } from '../feed-sources/folder-order';
import { isFileExcluded } from '../feed-sources/folder-exclusions';
import type { ExcludedFolderRule } from '../settings';
import type { FolderFeedState } from '../types/feed';
import { FolderSuggestModal } from './folder-suggest-modal';

type FolderScopeChoice = {
	label: string;
	state: FolderFeedState;
};

export class FolderPickerModal extends FolderSuggestModal {
	constructor(
		app: App,
		onChoose: (state: FolderFeedState) => void,
		excludedFolders: readonly ExcludedFolderRule[] = [],
	) {
		super(app, 'Choose a folder for doom scroll…', (folder) => {
			openFolderScopePicker(app, folder, onChoose, excludedFolders);
		});
	}
}

export function openFolderScopePicker(
	app: App,
	folder: TFolder,
	onChoose: (state: FolderFeedState) => void,
	excludedFolders: readonly ExcludedFolderRule[] = [],
): void {
	const choices = buildFolderScopeChoices(
		app,
		folder.path,
		excludedFolders,
	);
	if (choices.length === 0) {
		new Notice('This folder contains no included Markdown notes.');
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
	excludedFolders: readonly ExcludedFolderRule[],
): FolderScopeChoice[] {
	const files = app.vault.getMarkdownFiles();
	return [
		buildFolderScopeChoice(files, folderPath, false, excludedFolders),
		buildFolderScopeChoice(files, folderPath, true, excludedFolders),
	].filter((choice): choice is FolderScopeChoice => choice !== null);
}

function buildFolderScopeChoice(
	files: readonly TFile[],
	folderPath: string,
	recursive: boolean,
	excludedFolders: readonly ExcludedFolderRule[],
): FolderScopeChoice | null {
	const orderedFiles = orderFolderFiles(files, folderPath, recursive).filter(
		(file) => !isFileExcluded(file.path, excludedFolders),
	);
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
