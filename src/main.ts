import {
	MarkdownView,
	Plugin,
	TFile,
	TFolder,
	type WorkspaceLeaf,
} from 'obsidian';
import { BaseContextRegistry } from './bases/base-context-registry';
import { DoomScrollBasesView } from './bases/doom-scroll-bases-view';
import {
	DOOM_SCROLL_BASES_VIEW_TYPE,
	DOOM_SCROLL_VIEW_TYPE,
} from './constants';
import type { DoomScrollViewState } from './types/feed';
import { DoomScrollView } from './ui/doom-scroll-view';
import {
	FolderPickerModal,
	openFolderScopePicker,
} from './ui/folder-picker-modal';
import { SourcePickerModal } from './ui/source-picker-modal';

export default class DoomScrollPlugin extends Plugin {
	private readonly baseContexts = new BaseContextRegistry();

	override onload(): void {
		this.registerView(
			DOOM_SCROLL_VIEW_TYPE,
			(leaf) => new DoomScrollView(leaf, this.baseContexts),
		);
		this.registerBasesView(DOOM_SCROLL_BASES_VIEW_TYPE, {
			name: 'Doom scroll',
			icon: 'align-justify',
			factory: (controller, containerEl) =>
				new DoomScrollBasesView(
					controller,
					containerEl,
					this.baseContexts,
					(baseState, nextState) => {
						void this.openFeedFromBase(baseState, nextState);
					},
				),
		});

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
		this.addCommand({
			id: 'exit-feed',
			name: 'Exit feed to anchor note',
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(DoomScrollView);
				if (!view) {
					return false;
				}
				if (!checking) {
					view.exitToAnchor();
				}
				return true;
			},
		});
		this.addCommand({
			id: 'open-folder-feed',
			name: 'Open folder feed…',
			callback: () => this.openFolderPicker(),
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file, _source, leaf) => {
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item
							.setTitle('Doom scroll folder…')
							.setIcon('align-justify');
						item.onClick(() => {
							openFolderScopePicker(this.app, file, (state) => {
								void this.openFeed(state, leaf);
							});
						});
					});
					return;
				}
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

	override onunload(): void {
		this.baseContexts.clear();
	}

	private openPickerForActiveNote(): void {
		const file = this.getActiveMarkdownFile();
		if (!file) {
			this.openFolderPicker();
			return;
		}
		this.openSourcePicker(file);
	}

	private openFolderPicker(preferredLeaf?: WorkspaceLeaf): void {
		new FolderPickerModal(this.app, (state) => {
			void this.openFeed(state, preferredLeaf);
		}).open();
	}

	private openSourcePicker(file: TFile, preferredLeaf?: WorkspaceLeaf): void {
		new SourcePickerModal(this.app, file, (state) => {
			void this.openFeed(state, preferredLeaf);
		}).open();
	}

	private async openFeed(
		state: DoomScrollViewState,
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
			state,
		});
		await this.app.workspace.revealLeaf(targetLeaf);
	}

	private async openFeedFromBase(
		baseState: DoomScrollViewState,
		nextState: DoomScrollViewState,
	): Promise<void> {
		const targetLeaf = this.app.workspace.getLeaf(false);
		await targetLeaf.setViewState({
			type: DOOM_SCROLL_VIEW_TYPE,
			active: true,
			state: baseState,
		});
		await this.app.workspace.revealLeaf(targetLeaf);
		if (targetLeaf.view instanceof DoomScrollView) {
			targetLeaf.view.navigateTo(nextState);
		}
	}

	private getActiveMarkdownFile(): TFile | null {
		const file = this.app.workspace.getActiveFile();
		return file?.extension === 'md' ? file : null;
	}
}
