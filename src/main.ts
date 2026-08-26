import {
	MarkdownView,
	Notice,
	Plugin,
	TFile,
	TFolder,
	type WorkspaceLeaf,
} from 'obsidian';
import { BaseContextRegistry } from './bases/base-context-registry';
import { DoomScrollBasesView } from './bases/doom-scroll-bases-view';
import {
	DOOM_SCROLL_BASES_VIEW_TYPE,
	DOOM_SCROLL_HOVER_SOURCE,
	DOOM_SCROLL_VIEW_TYPE,
} from './constants';
import {
	isFileExcluded,
	removeDeletedFolderPaths,
	renameExcludedFolderPaths,
} from './feed-sources/folder-exclusions';
import { orderVaultFilesNaturally } from './feed-sources/folder-order';
import { TextSearchContextRegistry } from './search/text-search-context-registry';
import { TextSearchIndex } from './search/text-search-index';
import { normalizeSearchQuery } from './search/text-match';
import {
	DEFAULT_SETTINGS,
	normalizeSettings,
	type DoomScrollSettings,
} from './settings';
import type { DoomScrollViewState } from './types/feed';
import { DoomScrollView } from './ui/doom-scroll-view';
import {
	FolderPickerModal,
	openFolderScopePicker,
} from './ui/folder-picker-modal';
import { DoomScrollSettingTab } from './ui/settings-tab';
import { SourcePickerModal } from './ui/source-picker-modal';

export default class DoomScrollPlugin extends Plugin {
	private readonly baseContexts = new BaseContextRegistry();
	private readonly textSearchContexts = new TextSearchContextRegistry();
	private readonly textSearchIndex = new TextSearchIndex(this.app);
	settings: DoomScrollSettings = { ...DEFAULT_SETTINGS };

	override async onload(): Promise<void> {
		this.settings = normalizeSettings(await this.loadData());
		this.registerHoverLinkSource(DOOM_SCROLL_HOVER_SOURCE, {
			display: 'Obsidian Doom Scroll',
			defaultMod: true,
		});
		this.registerView(
			DOOM_SCROLL_VIEW_TYPE,
			(leaf) =>
				new DoomScrollView(
					leaf,
					this.baseContexts,
					this.textSearchContexts,
					() => this.settings.excludedFolders,
				),
		);
		this.registerBasesView(DOOM_SCROLL_BASES_VIEW_TYPE, {
			name: 'Doom scroll',
			icon: 'align-justify',
			factory: (controller, containerEl) =>
				new DoomScrollBasesView(
					controller,
					containerEl,
					this.baseContexts,
					() => this.settings.excludedFolders,
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
		this.addSettingTab(new DoomScrollSettingTab(this.app, this));
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
		this.addCommand({
			id: 'open-selection-text-feed',
			name: 'Open feed for selected text',
			editorCheckCallback: (checking, editor, info) => {
				const query = normalizeSearchQuery(editor.getSelection());
				const { file } = info;
				if (
					!query ||
					!file ||
					isFileExcluded(file.path, this.settings.excludedFolders)
				) {
					return false;
				}
				if (!checking) {
					void this.openTextSearchFeed(
						query,
						file,
						info instanceof MarkdownView ? info.leaf : undefined,
					);
				}
				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file, _source, leaf) => {
				if (file instanceof TFolder) {
					menu.addItem((item) => {
						item
							.setTitle('Doom scroll folder…')
							.setIcon('align-justify');
						item.onClick(() => {
							openFolderScopePicker(
								this.app,
								file,
								(state) => {
									void this.openFeed(state, leaf);
								},
								this.settings.excludedFolders,
							);
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
			this.app.workspace.on('editor-menu', (menu, editor, info) => {
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
				const query = normalizeSearchQuery(editor.getSelection());
				if (
					query &&
					!isFileExcluded(file.path, this.settings.excludedFolders)
				) {
					menu.addItem((item) => {
						item
							.setTitle(formatTextSearchMenuTitle(query))
							.setIcon('text-search');
						item.onClick(() => {
							void this.openTextSearchFeed(
								query,
								file,
								info instanceof MarkdownView
									? info.leaf
									: undefined,
							);
						});
					});
				}
			}),
		);
		this.registerExcludedFolderEvents();
	}

	override onunload(): void {
		this.baseContexts.clear();
		this.textSearchContexts.clear();
		this.textSearchIndex.clear();
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof DoomScrollView) {
				leaf.view.refreshForSettings();
			}
		});
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
		new FolderPickerModal(
			this.app,
			(state) => {
				void this.openFeed(state, preferredLeaf);
			},
			this.settings.excludedFolders,
		).open();
	}

	private openSourcePicker(file: TFile, preferredLeaf?: WorkspaceLeaf): void {
		new SourcePickerModal(
			this.app,
			file,
			(state) => {
				void this.openFeed(state, preferredLeaf);
			},
			this.settings.excludedFolders,
		).open();
	}

	private async openFeed(
		state: DoomScrollViewState,
		preferredLeaf?: WorkspaceLeaf,
	): Promise<void> {
		if (
			state.source !== 'base' &&
			isFileExcluded(state.anchorPath, this.settings.excludedFolders)
		) {
			new Notice('This note is inside an excluded folder.');
			return;
		}
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

	private async openTextSearchFeed(
		query: string,
		anchor: TFile,
		preferredLeaf?: WorkspaceLeaf,
	): Promise<void> {
		if (isFileExcluded(anchor.path, this.settings.excludedFolders)) {
			new Notice('This note is inside an excluded folder.');
			return;
		}

		const progress = new Notice(`Searching for “${query}”…`, 0);
		try {
			const matchingFiles = await this.textSearchIndex.search(
				query,
				this.settings.excludedFolders,
			);
			const files = orderVaultFilesNaturally(
				matchingFiles.some((file) => file.path === anchor.path)
					? matchingFiles
					: [...matchingFiles, anchor],
			);
			const state = this.textSearchContexts.create(
				query,
				files.map((file) => file.path),
				anchor.path,
			);
			await this.openFeed(state, preferredLeaf);
			new Notice(
				`${files.length} matching ${files.length === 1 ? 'note' : 'notes'}.`,
			);
		} catch {
			new Notice('Doom Scroll could not search this vault.');
		} finally {
			progress.hide();
		}
	}

	private async openFeedFromBase(
		baseState: DoomScrollViewState,
		nextState: DoomScrollViewState,
	): Promise<void> {
		if (
			nextState.source !== 'base' &&
			isFileExcluded(
				nextState.anchorPath,
				this.settings.excludedFolders,
			)
		) {
			new Notice('This note is inside an excluded folder.');
			return;
		}
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

	private registerExcludedFolderEvents(): void {
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				if (file instanceof TFolder) {
					const previousRules = this.settings.excludedFolders;
					const renamedRules = renameExcludedFolderPaths(
						this.settings.excludedFolders,
						oldPath,
						file.path,
					);
					if (
						renamedRules.some(
							(rule, index) =>
								rule.path !== previousRules[index]?.path,
						)
					) {
						this.settings.excludedFolders = renamedRules;
						void this.saveSettings();
					}
				}
			}),
		);
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFolder) {
					const remainingRules = removeDeletedFolderPaths(
						this.settings.excludedFolders,
						file.path,
					);
					if (
						remainingRules.length !==
						this.settings.excludedFolders.length
					) {
						this.settings.excludedFolders = remainingRules;
						void this.saveSettings();
					}
				}
			}),
		);
	}
}

function formatTextSearchMenuTitle(query: string): string {
	const label = query.length > 48 ? `${query.slice(0, 47)}…` : query;
	return `Doom scroll notes containing “${label}”`;
}
