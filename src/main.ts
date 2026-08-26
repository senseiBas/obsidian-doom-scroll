import {
	MarkdownView,
	Notice,
	Plugin,
	TFile,
	type WorkspaceLeaf,
} from 'obsidian';
import { DOOM_SCROLL_VIEW_TYPE } from './constants';
import { DoomScrollView } from './ui/doom-scroll-view';
import {
	SourcePickerModal,
	type FolderFeedChoice,
} from './ui/source-picker-modal';

export default class DoomScrollPlugin extends Plugin {
	override onload(): void {
		this.registerView(
			DOOM_SCROLL_VIEW_TYPE,
			(leaf) => new DoomScrollView(leaf),
		);

		this.addRibbonIcon('align-justify', 'Doom scroll…', () => {
			this.openPickerForActiveNote();
		});

		this.addCommand({
			id: 'open-feed',
			name: 'Open feed…',
			checkCallback: (checking) => {
				const file = this.getActiveMarkdownFile();
				if (!file) {
					return false;
				}
				if (!checking) {
					this.openSourcePicker(file);
				}
				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file, _source, leaf) => {
				if (!(file instanceof TFile) || file.extension !== 'md') {
					return;
				}
				menu.addItem((item) => {
					item.setTitle('Doom scroll…').setIcon('align-justify');
					item.onClick(() => this.openSourcePicker(file, leaf));
				});
			}),
		);

		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, _editor, info) => {
				const { file } = info;
				if (!file || file.extension !== 'md') {
					return;
				}
				menu.addItem((item) => {
					item.setTitle('Doom scroll…').setIcon('align-justify');
					item.onClick(() =>
						this.openSourcePicker(
							file,
							info instanceof MarkdownView ? info.leaf : undefined,
						),
					);
				});
			}),
		);
	}

	private openPickerForActiveNote(): void {
		const file = this.getActiveMarkdownFile();
		if (!file) {
			new Notice('Open a Markdown note before starting doom scroll.');
			return;
		}
		this.openSourcePicker(file);
	}

	private openSourcePicker(file: TFile, preferredLeaf?: WorkspaceLeaf): void {
		new SourcePickerModal(this.app, (choice) => {
			void this.openFolderFeed(file, choice, preferredLeaf);
		}).open();
	}

	private async openFolderFeed(
		anchor: TFile,
		choice: FolderFeedChoice,
		preferredLeaf?: WorkspaceLeaf,
	): Promise<void> {
		const activeMarkdownView =
			this.app.workspace.getActiveViewOfType(MarkdownView);
		const targetLeaf =
			preferredLeaf?.view.navigation === true
				? preferredLeaf
				: (activeMarkdownView?.leaf ?? this.app.workspace.getLeaf(false));

		await targetLeaf.setViewState({
			type: DOOM_SCROLL_VIEW_TYPE,
			active: true,
			state: {
				source: 'folder',
				anchorPath: anchor.path,
				recursive: choice.recursive,
			},
		});
		await this.app.workspace.revealLeaf(targetLeaf);
	}

	private getActiveMarkdownFile(): TFile | null {
		const file = this.app.workspace.getActiveFile();
		return file?.extension === 'md' ? file : null;
	}
}
