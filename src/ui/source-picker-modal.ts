import { FuzzySuggestModal, type App } from 'obsidian';

export type FolderFeedChoice = {
	label: string;
	recursive: boolean;
};

const FOLDER_CHOICES: FolderFeedChoice[] = [
	{ label: 'This folder', recursive: false },
	{ label: 'This folder + subfolders', recursive: true },
];

export class SourcePickerModal extends FuzzySuggestModal<FolderFeedChoice> {
	constructor(
		app: App,
		private readonly onChoose: (choice: FolderFeedChoice) => void,
	) {
		super(app);
		this.setPlaceholder('Choose a doom scroll feed source…');
	}

	getItems(): FolderFeedChoice[] {
		return FOLDER_CHOICES;
	}

	getItemText(item: FolderFeedChoice): string {
		return item.label;
	}

	onChooseItem(item: FolderFeedChoice): void {
		this.onChoose(item);
	}
}
