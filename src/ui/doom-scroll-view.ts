import {
	ButtonComponent,
	ItemView,
	Notice,
	TFile,
	type ViewStateResult,
	type WorkspaceLeaf,
} from 'obsidian';
import { DOOM_SCROLL_VIEW_TYPE } from '../constants';
import { openFileForEditing } from '../editor/open-for-editing';
import { resolveFolderFeed } from '../feed-sources/folder-feed-source';
import {
	isDoomScrollViewState,
	type DoomScrollViewState,
} from '../types/feed';
import { VirtualFeed } from './virtual-feed';

export class DoomScrollView extends ItemView {
	private state: DoomScrollViewState | null = null;
	private feedComponent: VirtualFeed | null = null;
	private opened = false;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.navigation = true;
	}

	getViewType(): string {
		return DOOM_SCROLL_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'Doom scroll';
	}

	override getIcon(): string {
		return 'align-justify';
	}

	override getState(): Record<string, unknown> {
		return this.state ? { ...this.state } : {};
	}

	override async setState(
		state: unknown,
		result: ViewStateResult,
	): Promise<void> {
		this.state = isDoomScrollViewState(state) ? state : null;
		result.history = true;
		if (this.opened) {
			this.renderFeed();
		}
	}

	protected override async onOpen(): Promise<void> {
		this.opened = true;
		this.contentEl.addClass('doom-scroll-view');

		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				if (!this.state || !(file instanceof TFile)) {
					return;
				}
				if (this.state.anchorPath === oldPath) {
					this.state = { ...this.state, anchorPath: file.path };
				}
				this.renderFeed();
			}),
		);
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile) {
					this.renderFeed();
				}
			}),
		);

		this.renderFeed();
	}

	protected override async onClose(): Promise<void> {
		this.opened = false;
		this.removeFeedComponent();
		this.contentEl.empty();
	}

	override onResize(): void {
		this.feedComponent?.refresh();
	}

	private renderFeed(): void {
		this.removeFeedComponent();
		this.contentEl.empty();

		if (!this.state) {
			this.renderEmptyState('Choose a note to start Doom Scroll.');
			return;
		}

		const resolved = resolveFolderFeed(this.app, this.state);
		if (!resolved) {
			this.renderEmptyState('The anchor note is no longer available.');
			new Notice('Doom scroll anchor note is no longer available.');
			return;
		}

		const shellEl = this.contentEl.createDiv('doom-scroll-shell');
		const toolbarEl = shellEl.createDiv('doom-scroll-toolbar');
		toolbarEl.createDiv({
			cls: 'doom-scroll-source-label',
			text: resolved.state.recursive
				? 'Folder + subfolders'
				: 'Folder',
		});

		const anchor = resolved.files[resolved.anchorIndex];
		if (!anchor) {
			this.renderEmptyState('The anchor note is no longer available.');
			return;
		}

		new ButtonComponent(toolbarEl)
			.setButtonText('Exit feed')
			.setIcon('x')
			.setTooltip('Exit to the anchor note')
			.onClick(() => {
				void openFileForEditing(this.leaf, anchor);
			});

		const feedHostEl = shellEl.createDiv('doom-scroll-feed-host');
		this.feedComponent = new VirtualFeed({
			app: this.app,
			parentEl: feedHostEl,
			files: resolved.files,
			anchorIndex: resolved.anchorIndex,
			onOpenNote: (file) => {
				void openFileForEditing(this.leaf, file);
			},
		});
		this.addChild(this.feedComponent);
	}

	private removeFeedComponent(): void {
		if (this.feedComponent) {
			this.removeChild(this.feedComponent);
			this.feedComponent = null;
		}
	}

	private renderEmptyState(message: string): void {
		this.contentEl.createDiv({
			cls: 'doom-scroll-empty-state',
			text: message,
		});
	}
}
