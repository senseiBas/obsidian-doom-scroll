import {
	ButtonComponent,
	getLinkpath,
	ItemView,
	Notice,
	TFile,
	type ViewStateResult,
	type WorkspaceLeaf,
} from 'obsidian';
import { DOOM_SCROLL_VIEW_TYPE } from '../constants';
import {
	openFileForEditing,
	openFileNormally,
} from '../editor/open-for-editing';
import {
	describeFeedSource,
} from '../feed-sources/related-feed-source';
import { resolveFeed } from '../feed-sources/resolve-feed';
import { FeedHistory } from '../navigation/feed-history';
import {
	isDoomScrollViewState,
	type DoomScrollViewState,
} from '../types/feed';
import { JunctionModal } from './junction-modal';
import { VirtualFeed } from './virtual-feed';

export class DoomScrollView extends ItemView {
	private state: DoomScrollViewState | null = null;
	private history: FeedHistory<DoomScrollViewState> | null = null;
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
		this.history = this.state ? new FeedHistory(this.state) : null;
		result.history = true;
		if (this.opened) {
			this.renderFeed();
		}
	}

	protected override async onOpen(): Promise<void> {
		this.opened = true;
		this.contentEl.addClass('doom-scroll-view');
		this.registerVaultEvents();
		this.renderFeed();
	}

	protected override async onClose(): Promise<void> {
		this.saveScrollPosition();
		this.opened = false;
		this.removeFeedComponent();
		this.contentEl.empty();
	}

	override onResize(): void {
		this.feedComponent?.refresh();
	}

	private registerVaultEvents(): void {
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				if (!(file instanceof TFile) || !this.history) {
					return;
				}
				this.saveScrollPosition();
				this.history.updateContexts((context) =>
					context.anchorPath === oldPath
						? { ...context, anchorPath: file.path }
						: context,
				);
				this.state = this.history.current.context;
				this.renderFeed();
			}),
		);
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile) {
					this.rerenderPreservingScroll();
				}
			}),
		);
		this.registerEvent(
			this.app.metadataCache.on('resolved', () => {
				if (this.state?.source !== 'folder') {
					this.rerenderPreservingScroll();
				}
			}),
		);
	}

	private renderFeed(): void {
		this.removeFeedComponent();
		this.contentEl.empty();

		if (!this.state) {
			this.renderEmptyState('Choose a note to start Doom Scroll.');
			return;
		}

		const resolved = resolveFeed(this.app, this.state);
		if (!resolved) {
			this.renderEmptyState('The anchor note is no longer available.');
			new Notice('Doom scroll anchor note is no longer available.');
			return;
		}

		const anchor = resolved.files[resolved.anchorIndex];
		if (!anchor) {
			this.renderEmptyState('The anchor note is no longer available.');
			return;
		}

		const shellEl = this.contentEl.createDiv('doom-scroll-shell');
		this.renderToolbar(shellEl, anchor);
		const feedHostEl = shellEl.createDiv('doom-scroll-feed-host');
		this.feedComponent = new VirtualFeed({
			app: this.app,
			parentEl: feedHostEl,
			files: resolved.files,
			anchorIndex: resolved.anchorIndex,
			initialScrollTop: this.history?.current.scrollTop ?? undefined,
			onInternalLink: (sourceFile, linkText) => {
				this.openJunction(sourceFile, linkText);
			},
			onEditNote: (file) => {
				void openFileForEditing(this.leaf, file);
			},
			onOpenNoteNormally: (file) => {
				void openFileNormally(this.leaf, file);
			},
		});
		this.addChild(this.feedComponent);
	}

	private renderToolbar(shellEl: HTMLElement, anchor: TFile): void {
		const toolbarEl = shellEl.createDiv('doom-scroll-toolbar');
		const historyEl = toolbarEl.createDiv('doom-scroll-history-actions');
		new ButtonComponent(historyEl)
			.setIcon('arrow-left')
			.setTooltip('Back')
			.setDisabled(!(this.history?.canGoBack ?? false))
			.onClick(() => this.goBack());
		new ButtonComponent(historyEl)
			.setIcon('arrow-right')
			.setTooltip('Forward')
			.setDisabled(!(this.history?.canGoForward ?? false))
			.onClick(() => this.goForward());

		toolbarEl.createDiv({
			cls: 'doom-scroll-source-label',
			text: this.state ? describeFeedSource(this.state) : '',
		});
		new ButtonComponent(toolbarEl)
			.setButtonText('Exit feed')
			.setIcon('x')
			.setTooltip('Exit to the anchor note')
			.onClick(() => {
				void openFileForEditing(this.leaf, anchor);
			});
	}

	private openJunction(sourceFile: TFile, linkText: string): void {
		const linkedFile = this.app.metadataCache.getFirstLinkpathDest(
			getLinkpath(linkText),
			sourceFile.path,
		);
		if (!linkedFile || linkedFile.extension !== 'md') {
			new Notice('The linked note could not be resolved.');
			return;
		}

		new JunctionModal(
			this.app,
			linkedFile,
			() => {
				this.saveScrollPosition();
				void this.app.workspace.openLinkText(
					linkText,
					sourceFile.path,
					false,
				);
			},
			(state) => this.navigate(state),
		).open();
	}

	private navigate(state: DoomScrollViewState): void {
		const scrollTop = this.feedComponent?.getScrollTop() ?? 0;
		if (this.history) {
			this.state = this.history.navigate(state, scrollTop).context;
		} else {
			this.history = new FeedHistory(state);
			this.state = state;
		}
		this.renderFeed();
	}

	private goBack(): void {
		const entry = this.history?.back(
			this.feedComponent?.getScrollTop() ?? 0,
		);
		if (entry) {
			this.state = entry.context;
			this.renderFeed();
		}
	}

	private goForward(): void {
		const entry = this.history?.forward(
			this.feedComponent?.getScrollTop() ?? 0,
		);
		if (entry) {
			this.state = entry.context;
			this.renderFeed();
		}
	}

	private rerenderPreservingScroll(): void {
		this.saveScrollPosition();
		this.renderFeed();
	}

	private saveScrollPosition(): void {
		if (this.history && this.feedComponent) {
			this.history.saveScroll(this.feedComponent.getScrollTop());
		}
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
