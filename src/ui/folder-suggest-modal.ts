import { FuzzySuggestModal, TFolder, type App } from 'obsidian';

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
	constructor(
		app: App,
		placeholder: string,
		private readonly onChoose: (folder: TFolder) => void,
	) {
		super(app);
		this.setPlaceholder(placeholder);
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
		this.onChoose(folder);
	}
}
