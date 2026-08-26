import { Component, type App, type TFile } from 'obsidian';
import {
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
	onOpenNote: (file: TFile) => void;
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
			model.offsets[this.options.anchorIndex] ?? 0;
		this.updateWindow();
	}

	override onunload(): void {
		const viewWindow = this.getWindow();
		if (this.frameId !== null) {
			viewWindow.cancelAnimationFrame(this.frameId);
			this.frameId = null;
		}
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.mountedCards.clear();
		this.viewportEl.remove();
	}

	refresh(): void {
		this.scheduleUpdate();
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
			onHeightChanged: (height) => {
				this.recordHeight(index, file.path, height);
			},
			onOpen: this.options.onOpenNote,
		});
		this.mountedCards.set(index, card);
		this.addChild(card);
	}

	private unmountOutsideRange(startIndex: number, endIndex: number): void {
		for (const [index, card] of this.mountedCards) {
			if (index < startIndex || index > endIndex) {
				this.removeChild(card);
				this.mountedCards.delete(index);
			}
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
				return file ? this.measuredHeights.get(file.path) : undefined;
			},
			DEFAULT_NOTE_HEIGHT,
		);
	}

	private getWindow(): Window {
		return this.viewportEl.ownerDocument.defaultView ?? window;
	}
}
