import { Component, type App, type TFile } from 'obsidian';
import {
	COLLAPSED_NOTE_HEIGHT,
	DEFAULT_NOTE_HEIGHT,
	VIRTUAL_OVERSCAN_PX,
} from '../constants';
import {
	buildVirtualOffsets,
	findIndexAtOffset,
} from '../virtualization/height-model';
import { NoteCard } from './note-card';

type VirtualFeedOptions = {
	app: App;
	parentEl: HTMLElement;
	files: readonly TFile[];
	anchorIndex: number;
	highlightText?: string;
	initialScrollTop?: number;
	onInternalLink: (sourceFile: TFile, linkText: string) => void;
	onTagLink: (
		sourceFile: TFile,
		tag: string,
		openNormally: () => void,
	) => void;
	onEditNote: (file: TFile) => void;
	onOpenNoteNormally: (file: TFile) => void;
	onOpenNoteInBackgroundTab: (file: TFile) => void;
	onQuickEditStateChange?: (editing: boolean) => void;
	onRenderProperties?: (file: TFile, containerEl: HTMLElement) => number;
	onVisibleNoteChange?: (file: TFile) => void;
	onDeleteNote?: (file: TFile) => void;
	/** Shared set of collapsed note paths, owned by the host so it survives re-renders. */
	collapsedPaths: Set<string>;
};

export class VirtualFeed extends Component {
	private readonly viewportEl: HTMLElement;
	private readonly topSpacerEl: HTMLElement;
	private readonly itemsEl: HTMLElement;
	private readonly bottomSpacerEl: HTMLElement;
	private readonly mountedCards = new Map<number, NoteCard>();
	private readonly measuredHeights = new Map<string, number>();

	private frameId: number | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private editingIndex: number | null = null;
	private lastVisibleIndex: number | null = null;

	constructor(private readonly options: VirtualFeedOptions) {
		super();
		this.viewportEl = options.parentEl.createDiv({
			cls: 'doom-scroll-viewport',
			attr: {
				role: 'feed',
				'aria-label': 'Doom Scroll notes',
			},
		});
		this.topSpacerEl = this.viewportEl.createDiv('doom-scroll-spacer');
		this.itemsEl = this.viewportEl.createDiv('doom-scroll-items');
		this.bottomSpacerEl = this.viewportEl.createDiv('doom-scroll-spacer');
	}

	override onload(): void {
		this.registerDomEvent(this.viewportEl, 'scroll', () => {
			this.scheduleUpdate();
		});

		this.resizeObserver = new ResizeObserver(() => this.scheduleUpdate());
		this.resizeObserver.observe(this.viewportEl);

		const model = this.createHeightModel();
		this.bottomSpacerEl.setCssProps({ height: `${model.totalHeight}px` });
		this.viewportEl.scrollTop =
			this.options.initialScrollTop ??
			(model.offsets[this.options.anchorIndex] ?? 0);
		this.updateWindow();
		this.reportVisibleNote();
	}

	override onunload(): void {
		const viewWindow = this.getWindow();
		if (this.frameId !== null) {
			viewWindow.cancelAnimationFrame(this.frameId);
			this.frameId = null;
		}
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.editingIndex = null;
		this.mountedCards.clear();
		this.viewportEl.remove();
	}

	refresh(): void {
		this.scheduleUpdate();
	}

	/** Collapse every note, keeping the first visible note in place. */
	collapseAll(): void {
		this.setAllCollapsed(true);
	}

	/** Expand every note, keeping the first visible note in place. */
	expandAll(): void {
		this.setAllCollapsed(false);
	}

	private setAllCollapsed(collapsed: boolean): void {
		const firstIndex = Math.max(0, this.getFirstVisibleIndex());
		for (const file of this.options.files) {
			if (collapsed) this.options.collapsedPaths.add(file.path);
			else this.options.collapsedPaths.delete(file.path);
		}
		// Measured heights are now stale for the new state; drop them so the
		// model uses the collapsed/default estimate until cards re-measure.
		this.measuredHeights.clear();
		for (const card of this.mountedCards.values()) {
			card.setCollapsed(collapsed);
		}
		const model = this.createHeightModel();
		this.viewportEl.scrollTop = model.offsets[firstIndex] ?? 0;
		this.updateWindow();
	}

	private handleToggleCollapse(path: string, collapsed: boolean): void {
		if (collapsed) this.options.collapsedPaths.add(path);
		else this.options.collapsedPaths.delete(path);
		// The card's own height changed; drop the stale measurement so the model
		// recomputes (the ResizeObserver will record the accurate height).
		this.measuredHeights.delete(path);
		this.scheduleUpdate();
	}

	getScrollTop(): number {
		return this.viewportEl.scrollTop;
	}

	private scheduleUpdate(): void {
		if (this.frameId !== null) {
			return;
		}

		const viewWindow = this.getWindow();
		this.frameId = viewWindow.requestAnimationFrame(() => {
			this.frameId = null;
			this.updateWindow();
		});
	}

	private updateWindow(): void {
		if (this.options.files.length === 0) {
			this.topSpacerEl.setCssProps({ height: '0px' });
			this.bottomSpacerEl.setCssProps({ height: '0px' });
			return;
		}

		const model = this.createHeightModel();
		const viewportHeight = Math.max(this.viewportEl.clientHeight, 800);
		const startOffset = Math.max(
			0,
			this.viewportEl.scrollTop - VIRTUAL_OVERSCAN_PX,
		);
		const endOffset = Math.min(
			model.totalHeight,
			this.viewportEl.scrollTop + viewportHeight + VIRTUAL_OVERSCAN_PX,
		);
		const startIndex = findIndexAtOffset(model.offsets, startOffset);
		const endIndex = findIndexAtOffset(model.offsets, endOffset);

		if (startIndex < 0 || endIndex < 0) {
			return;
		}

		this.unmountOutsideRange(startIndex, endIndex);
		for (let index = startIndex; index <= endIndex; index += 1) {
			this.mountCard(index);
		}
		this.orderMountedCards(startIndex, endIndex);

		this.topSpacerEl.setCssProps({
			height: `${model.offsets[startIndex] ?? 0}px`,
		});
		const mountedEnd = model.offsets[endIndex + 1] ?? model.totalHeight;
		this.bottomSpacerEl.setCssProps({
			height: `${Math.max(0, model.totalHeight - mountedEnd)}px`,
		});

		this.reportVisibleNote();
	}

	/**
	 * Tell the host which note currently sits at the top of the viewport, so the
	 * toolbar can show what you are scrolling through. Only fires when the
	 * top-most note changes.
	 */
	private reportVisibleNote(): void {
		if (!this.options.onVisibleNoteChange || this.options.files.length === 0) {
			return;
		}
		const index = this.getFirstVisibleIndex();
		if (index < 0 || index === this.lastVisibleIndex) {
			return;
		}
		const file = this.options.files[index];
		if (!file) {
			return;
		}
		this.lastVisibleIndex = index;
		this.options.onVisibleNoteChange(file);
	}

	private mountCard(index: number): void {
		if (this.mountedCards.has(index)) {
			return;
		}

		const file = this.options.files[index];
		if (!file) {
			return;
		}

		const card = new NoteCard({
			app: this.options.app,
			file,
			parentEl: this.itemsEl,
			highlightText: this.options.highlightText,
			onHeightChanged: (height) => {
				this.recordHeight(index, file.path, height);
			},
			onInternalLink: this.options.onInternalLink,
			onTagLink: this.options.onTagLink,
			onEdit: this.options.onEditNote,
			onOpenNormally: this.options.onOpenNoteNormally,
			onOpenInBackgroundTab: this.options.onOpenNoteInBackgroundTab,
			onQuickEditStart: () => this.beginQuickEdit(index),
			onQuickEditEnd: () => this.endQuickEdit(index),
			onRenderProperties: this.options.onRenderProperties,
			onDelete: this.options.onDeleteNote,
			initialCollapsed: this.options.collapsedPaths.has(file.path),
			onToggleCollapse: (collapsed) =>
				this.handleToggleCollapse(file.path, collapsed),
		});
		this.mountedCards.set(index, card);
		this.addChild(card);
	}

	private unmountOutsideRange(startIndex: number, endIndex: number): void {
		for (const [index, card] of this.mountedCards) {
			if (
				index !== this.editingIndex &&
				(index < startIndex || index > endIndex)
			) {
				this.removeChild(card);
				this.mountedCards.delete(index);
			}
		}
	}

	private beginQuickEdit(index: number): boolean {
		if (this.editingIndex !== null) {
			return false;
		}
		this.editingIndex = index;
		this.viewportEl.addClass('is-quick-editing');
		this.options.onQuickEditStateChange?.(true);
		return true;
	}

	private endQuickEdit(index: number): void {
		if (this.editingIndex === index) {
			this.editingIndex = null;
			this.viewportEl.removeClass('is-quick-editing');
			this.scheduleUpdate();
			this.options.onQuickEditStateChange?.(false);
		}
	}

	private orderMountedCards(startIndex: number, endIndex: number): void {
		for (let index = startIndex; index <= endIndex; index += 1) {
			const card = this.mountedCards.get(index);
			if (card) {
				this.itemsEl.appendChild(card.containerEl);
			}
		}
	}

	private recordHeight(index: number, path: string, height: number): void {
		const previousHeight =
			this.measuredHeights.get(path) ?? DEFAULT_NOTE_HEIGHT;
		if (Math.abs(previousHeight - height) < 1) {
			return;
		}

		const firstVisibleIndex = this.getFirstVisibleIndex();
		this.measuredHeights.set(path, height);
		if (index < firstVisibleIndex) {
			this.viewportEl.scrollTop += height - previousHeight;
		}
		this.scheduleUpdate();
	}

	private getFirstVisibleIndex(): number {
		return findIndexAtOffset(
			this.createHeightModel().offsets,
			this.viewportEl.scrollTop,
		);
	}

	private createHeightModel() {
		return buildVirtualOffsets(
			this.options.files.length,
			(index) => {
				const file = this.options.files[index];
				if (!file) return undefined;
				const measured = this.measuredHeights.get(file.path);
				if (measured !== undefined) return measured;
				return this.options.collapsedPaths.has(file.path)
					? COLLAPSED_NOTE_HEIGHT
					: undefined;
			},
			DEFAULT_NOTE_HEIGHT,
		);
	}

	private getWindow(): Window {
		return this.viewportEl.ownerDocument.defaultView ?? window;
	}
}
