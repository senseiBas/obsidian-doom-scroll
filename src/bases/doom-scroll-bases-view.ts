import {
	BasesView,
	ButtonComponent,
	getLinkpath,
	Notice,
	type QueryController,
	type TFile,
} from 'obsidian';
import { DOOM_SCROLL_BASES_VIEW_TYPE } from '../constants';
import { isFileExcluded } from '../feed-sources/folder-exclusions';
import {
	openFileForEditing,
	openFileNormally,
} from '../editor/open-for-editing';
import { FeedHistory } from '../navigation/feed-history';
import type { ExcludedFolderRule } from '../settings';
import type {
	BaseFeedState,
	DoomScrollViewState,
} from '../types/feed';
import { JunctionModal } from '../ui/junction-modal';
import { TagJunctionModal } from '../ui/tag-junction-modal';
import { VirtualFeed } from '../ui/virtual-feed';
import type { BaseContextRegistry } from './base-context-registry';

export type StartFeedFromBase = (
	baseState: BaseFeedState,
	nextState: DoomScrollViewState,
) => void;

export class DoomScrollBasesView extends BasesView {
	type = DOOM_SCROLL_BASES_VIEW_TYPE;

	private readonly rootEl: HTMLDivElement;
	private feedComponent: VirtualFeed | null = null;
	private history: FeedHistory<string> | null = null;
	private baseState: BaseFeedState | null = null;
	private files: TFile[] = [];

	constructor(
		controller: QueryController,
		containerEl: HTMLElement,
		private readonly contexts: BaseContextRegistry,
		private readonly getExcludedFolders: () => readonly ExcludedFolderRule[],
		private readonly startFeedFromBase: StartFeedFromBase,
	) {
		super(controller);
		this.rootEl = containerEl.createDiv('doom-scroll-bases-view');
	}

	override onDataUpdated(): void {
		this.files = this.data.data
			.map((entry) => entry.file)
			.filter(
				(file) => file.extension.toLocaleLowerCase() === 'md',
			);
		const paths = this.files.map((file) => file.path);
		const currentAnchor = this.history?.current.context;
		const anchorPath =
			currentAnchor && paths.includes(currentAnchor)
				? currentAnchor
				: (paths[0] ?? '');
		const label = this.config.name || 'Base view';

		if (this.baseState) {
			this.contexts.update(this.baseState.contextId, label, paths);
			this.baseState = { ...this.baseState, anchorPath, label };
		} else if (anchorPath) {
			this.baseState = this.contexts.create(label, paths, anchorPath);
		}

		if (
			anchorPath &&
			(!this.history || !paths.includes(this.history.current.context))
		) {
			this.history = new FeedHistory(anchorPath);
		}
		this.renderFeed();
	}

	override onunload(): void {
		this.removeFeedComponent();
		this.rootEl.remove();
	}

	private renderFeed(): void {
		this.removeFeedComponent();
		this.rootEl.empty();
		const anchorPath = this.history?.current.context;
		const anchorIndex = this.files.findIndex(
			(file) => file.path === anchorPath,
		);
		if (anchorIndex < 0) {
			this.rootEl.createDiv({
				cls: 'doom-scroll-empty-state',
				text: 'This Base view has no Markdown notes to show.',
			});
			return;
		}
		const anchor = this.files[anchorIndex];
		if (!anchor) {
			return;
		}

		const shellEl = this.rootEl.createDiv('doom-scroll-shell');
		this.renderToolbar(shellEl, anchor);
		const feedHostEl = shellEl.createDiv('doom-scroll-feed-host');
		this.feedComponent = new VirtualFeed({
			app: this.app,
			parentEl: feedHostEl,
			files: this.files,
			anchorIndex,
			initialScrollTop: this.history?.current.scrollTop ?? undefined,
			onInternalLink: (sourceFile, linkText) => {
				this.openJunction(sourceFile, linkText);
			},
			onTagLink: (sourceFile, tag, openNormally) => {
				this.openTagJunction(sourceFile, tag, openNormally);
			},
			onEditNote: (file) => {
				void openFileForEditing(this.app.workspace.getLeaf(false), file);
			},
			onOpenNoteNormally: (file) => {
				void openFileNormally(this.app.workspace.getLeaf(false), file);
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
			text: `Base: ${this.config.name || 'Base view'}`,
		});
		new ButtonComponent(toolbarEl)
			.setButtonText('Exit feed')
			.setIcon('x')
			.setTooltip('Exit to the anchor note')
			.onClick(() => {
				void openFileForEditing(
					this.app.workspace.getLeaf(false),
					anchor,
				);
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

		const currentBaseAction = this.files.some(
			(file) => file.path === linkedFile.path,
		)
			? [
					{
						label: 'Doom scroll: Current Base view',
						run: () => this.navigateToAnchor(linkedFile.path),
					},
				]
			: [];
		new JunctionModal(
			this.app,
			linkedFile,
			() => {
				void openFileNormally(
					this.app.workspace.getLeaf(false),
					linkedFile,
				);
			},
			(state) => {
				const baseState = this.getCurrentBaseState();
				if (baseState) {
					this.startFeedFromBase(baseState, state);
				}
			},
			currentBaseAction,
			!isFileExcluded(linkedFile.path, this.getExcludedFolders()),
		).open();
	}

	private openTagJunction(
		sourceFile: TFile,
		tag: string,
		openNormally: () => void,
	): void {
		const anchorAllowed = !isFileExcluded(
			sourceFile.path,
			this.getExcludedFolders(),
		);
		new TagJunctionModal(
			this.app,
			tag,
			openNormally,
			() => {
				const baseState = this.getCurrentBaseState();
				if (baseState) {
					this.startFeedFromBase(baseState, {
						source: 'tag',
						anchorPath: sourceFile.path,
						tag,
					});
				}
			},
			anchorAllowed,
		).open();
	}

	private getCurrentBaseState(): BaseFeedState | null {
		const anchorPath = this.history?.current.context;
		return this.baseState && anchorPath
			? { ...this.baseState, anchorPath }
			: null;
	}

	private navigateToAnchor(anchorPath: string): void {
		const scrollTop = this.feedComponent?.getScrollTop() ?? 0;
		if (this.history) {
			this.history.navigate(anchorPath, scrollTop);
		} else {
			this.history = new FeedHistory(anchorPath);
		}
		this.renderFeed();
	}

	private goBack(): void {
		const entry = this.history?.back(
			this.feedComponent?.getScrollTop() ?? 0,
		);
		if (entry) {
			this.renderFeed();
		}
	}

	private goForward(): void {
		const entry = this.history?.forward(
			this.feedComponent?.getScrollTop() ?? 0,
		);
		if (entry) {
			this.renderFeed();
		}
	}

	private removeFeedComponent(): void {
		if (this.feedComponent) {
			this.removeChild(this.feedComponent);
			this.feedComponent = null;
		}
	}
}
