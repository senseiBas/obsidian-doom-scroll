import {
	ButtonComponent,
	Component,
	Keymap,
	MarkdownRenderer,
	Notice,
	Platform,
	setIcon,
	type App,
	type HoverParent,
	type HoverPopover,
	type TFile,
} from 'obsidian';
import { DOOM_SCROLL_HOVER_SOURCE } from '../constants';
import { normalizeRenderedTag } from '../feed-sources/tag-link';
import { highlightRenderedText } from '../search/highlight-rendered-text';
import { QuickEditPanel } from './quick-edit-panel';

type NoteCardOptions = {
	app: App;
	file: TFile;
	parentEl: HTMLElement;
	highlightText?: string;
	onHeightChanged: (height: number) => void;
	onInternalLink: (sourceFile: TFile, linkText: string) => void;
	onTagLink: (
		sourceFile: TFile,
		tag: string,
		openNormally: () => void,
	) => void;
	onEdit: (file: TFile) => void;
	onOpenNormally: (file: TFile) => void;
	onOpenInBackgroundTab: (file: TFile) => void;
	onQuickEditStart: () => boolean;
	onQuickEditEnd: () => void;
	/** Delete this note (with the user's usual confirmation / trash behaviour). */
	onDelete?: (file: TFile) => void;
	/** Whether the card should start collapsed (content hidden). */
	initialCollapsed?: boolean;
	/** Notify the host when the user toggles this card's collapsed state. */
	onToggleCollapse?: (collapsed: boolean) => void;
	/**
	 * Render Base-configured properties into the given container. Only supplied
	 * in the Bases view; returns the number of chips rendered so the card can
	 * drop the container when there is nothing to show.
	 */
	onRenderProperties?: (file: TFile, containerEl: HTMLElement) => number;
};

export class NoteCard extends Component implements HoverParent {
	readonly containerEl: HTMLElement;
	hoverPopover: HoverPopover | null = null;

	private active = false;
	private resizeObserver: ResizeObserver | null = null;
	private readonly passThroughTags = new WeakSet<HTMLElement>();
	private markdownEl: HTMLElement | null = null;
	private propsEl: HTMLElement | null = null;
	private collapseEl: HTMLElement | null = null;
	private collapsed = false;
	private editButton: ButtonComponent | null = null;
	private previewComponent: Component | null = null;
	private quickEditor: QuickEditPanel | null = null;
	private editing = false;

	constructor(private readonly options: NoteCardOptions) {
		super();
		this.containerEl = options.parentEl.createDiv({
			cls: 'doom-scroll-note',
			attr: {
				role: 'article',
				'aria-label': options.file.basename,
				'data-path': options.file.path,
			},
		});
	}

	override onload(): void {
		this.active = true;
		const headerEl = this.containerEl.createDiv('doom-scroll-note-header');

		const collapseEl = headerEl.createDiv({
			cls: 'doom-scroll-note-collapse',
			attr: { 'aria-label': 'Collapse note', role: 'button' },
		});
		setIcon(collapseEl, 'chevron-down');
		this.collapseEl = collapseEl;
		this.registerDomEvent(collapseEl, 'click', () => this.toggleCollapse());

		const dragHandleEl = headerEl.createDiv({
			cls: 'doom-scroll-drag-handle',
			attr: {
				draggable: 'true',
				'aria-label': 'Drag to insert a link (Ctrl/Cmd: embed)',
			},
		});
		setIcon(dragHandleEl, 'grip-vertical');
		this.registerDomEvent(dragHandleEl, 'dragstart', (event) => {
			if (!event.dataTransfer) {
				return;
			}
			const link = this.options.app.fileManager.generateMarkdownLink(
				this.options.file,
				'',
			);
			// Ctrl/Cmd while dragging inserts an embed instead of a plain link.
			const embed = event.ctrlKey || event.metaKey;
			event.dataTransfer.clearData();
			event.dataTransfer.setData('text/plain', embed ? `!${link}` : link);
			event.dataTransfer.effectAllowed = 'copyLink';
			this.containerEl.addClass('is-dragging');
		});
		this.registerDomEvent(dragHandleEl, 'dragend', () => {
			this.containerEl.removeClass('is-dragging');
		});

		const titleEl = headerEl.createDiv({
			cls: 'doom-scroll-note-title',
			text: this.options.file.basename,
		});
		highlightRenderedText(titleEl, this.options.highlightText);

		const actionsEl = headerEl.createDiv('doom-scroll-note-actions');
		new ButtonComponent(actionsEl)
			.setButtonText('Open')
			.setIcon('file-text')
			.setTooltip('Open note (Ctrl/Cmd+click: background tab)')
			.onClick((event) => {
				if (Keymap.isModEvent(event) === 'tab') {
					this.options.onOpenInBackgroundTab(this.options.file);
				} else {
					this.options.onOpenNormally(this.options.file);
				}
			});
		this.editButton = new ButtonComponent(actionsEl)
			.setButtonText(Platform.isMobile ? 'Edit / exit here' : 'Quick edit')
			.setIcon('pencil')
			.setTooltip(
				Platform.isMobile
					? 'Open in the Obsidian editor'
					: 'Quick edit Markdown in this feed',
			)
			.onClick(() => {
				if (Platform.isMobile) {
					this.options.onEdit(this.options.file);
				} else {
					void this.startQuickEdit();
				}
			});
		this.editButton.setDisabled(true);

		new ButtonComponent(actionsEl)
			.setIcon('trash-2')
			.setTooltip('Delete note')
			.onClick(() => this.options.onDelete?.(this.options.file));

		if (this.options.onRenderProperties) {
			const propsEl = this.containerEl.createDiv('doom-scroll-note-props');
			const count = this.options.onRenderProperties(
				this.options.file,
				propsEl,
			);
			if (count === 0) {
				propsEl.remove();
			} else {
				this.propsEl = propsEl;
			}
		}

		this.markdownEl = this.containerEl.createDiv({
			cls: ['doom-scroll-note-content', 'markdown-rendered'],
		});
		this.registerDomEvent(
			this.markdownEl,
			'mouseover',
			(event) => {
				const target = event.target as Element | null;
				const linkEl = target?.closest?.(
					'a.internal-link',
				) as HTMLElement | null;
				if (!linkEl || !this.markdownEl?.contains(linkEl)) {
					return;
				}
				const relatedTarget = event.relatedTarget as Node | null;
				if (relatedTarget && linkEl.contains(relatedTarget)) {
					return;
				}
				const linkText =
					linkEl.getAttribute('data-href') ??
					linkEl.getAttribute('href');
				if (!linkText) {
					return;
				}

				this.options.app.workspace.trigger('hover-link', {
					event,
					source: DOOM_SCROLL_HOVER_SOURCE,
					hoverParent: this,
					targetEl: linkEl,
					linktext: linkText,
					sourcePath: this.options.file.path,
				});
			},
		);
		this.registerDomEvent(
			this.markdownEl,
			'click',
			(event) => {
				if (event.button !== 0) {
					return;
				}
				const target = event.target as Element | null;
				const tagEl = target?.closest?.('a.tag') as HTMLElement | null;
				if (tagEl && this.markdownEl?.contains(tagEl)) {
					if (this.passThroughTags.delete(tagEl)) {
						return;
					}
					const tag = normalizeRenderedTag(
						tagEl.getAttribute('data-tag') ??
							tagEl.getAttribute('href') ??
							tagEl.textContent,
					);
					if (!tag) {
						return;
					}
					event.preventDefault();
					event.stopImmediatePropagation();
					this.options.onTagLink(this.options.file, tag, () => {
						if (tagEl.isConnected) {
							this.passThroughTags.add(tagEl);
							tagEl.click();
						}
					});
					return;
				}
				const linkEl = target?.closest?.('a.internal-link');
				if (!linkEl || !this.markdownEl?.contains(linkEl)) {
					return;
				}
				const linkText =
					linkEl.getAttribute('data-href') ??
					linkEl.getAttribute('href');
				if (!linkText) {
					return;
				}

				event.preventDefault();
				event.stopImmediatePropagation();
				this.options.onInternalLink(this.options.file, linkText);
			},
			{ capture: true },
		);

		this.resizeObserver = new ResizeObserver(() => {
			const height = this.containerEl.getBoundingClientRect().height;
			if (height > 0) {
				this.options.onHeightChanged(height);
			}
		});
		this.resizeObserver.observe(this.containerEl);

		if (this.options.initialCollapsed) {
			this.applyCollapsed(true);
		}

		void this.renderPreview();
	}

	override onunload(): void {
		this.active = false;
		this.endQuickEdit(false);
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.markdownEl = null;
		this.propsEl = null;
		this.collapseEl = null;
		this.editButton = null;
		this.previewComponent = null;
		this.quickEditor = null;
		this.hoverPopover = null;
		this.containerEl.remove();
	}

	/** Set the collapsed state from the host (does not fire onToggleCollapse). */
	setCollapsed(collapsed: boolean): void {
		if (collapsed !== this.collapsed) {
			this.applyCollapsed(collapsed);
		}
	}

	private toggleCollapse(): void {
		this.applyCollapsed(!this.collapsed);
		this.options.onToggleCollapse?.(this.collapsed);
	}

	private applyCollapsed(collapsed: boolean): void {
		this.collapsed = collapsed;
		this.containerEl.toggleClass('is-collapsed', collapsed);
		if (this.collapseEl) {
			setIcon(this.collapseEl, collapsed ? 'chevron-right' : 'chevron-down');
			this.collapseEl.setAttribute(
				'aria-label',
				collapsed ? 'Expand note' : 'Collapse note',
			);
		}
	}

	private async startQuickEdit(): Promise<void> {
		if (this.collapsed) {
			this.applyCollapsed(false);
			this.options.onToggleCollapse?.(false);
		}
		this.containerEl.scrollIntoView({
			behavior: 'auto',
			block: 'start',
		});
		if (
			this.editing ||
			!this.markdownEl ||
			!this.options.onQuickEditStart()
		) {
			return;
		}
		this.editing = true;
		this.editButton?.setDisabled(true);

		try {
			const original = await this.options.app.vault.cachedRead(
				this.options.file,
			);
			if (!this.active || !this.markdownEl) {
				this.endQuickEdit();
				return;
			}
			this.removePreviewComponent();
			this.markdownEl.empty();
			this.markdownEl.removeClass('markdown-rendered');
			this.quickEditor = new QuickEditPanel({
				app: this.options.app,
				file: this.options.file,
				parentEl: this.markdownEl,
				original,
				onCancel: () => {
					void this.returnToPreview();
				},
				onSaved: () => {
					void this.returnToPreview();
				},
				onSavedAndOpen: () => this.openFullEditor(),
			});
			this.addChild(this.quickEditor);
		} catch {
			new Notice('Quick edit could not read this note.');
			this.endQuickEdit();
			this.editButton?.setDisabled(false);
		}
	}

	private async returnToPreview(): Promise<void> {
		this.removeQuickEditor();
		this.endQuickEdit();
		await this.renderPreview();
	}

	private openFullEditor(): void {
		this.removeQuickEditor();
		this.endQuickEdit();
		this.options.onEdit(this.options.file);
	}

	private async renderPreview(): Promise<void> {
		const markdownEl = this.markdownEl;
		if (!markdownEl) {
			return;
		}
		this.removePreviewComponent();
		markdownEl.empty();
		markdownEl.addClass('markdown-rendered');
		this.editButton?.setDisabled(true);
		const renderComponent = new Component();
		this.previewComponent = renderComponent;
		this.addChild(renderComponent);

		try {
			const markdown = await this.options.app.vault.cachedRead(
				this.options.file,
			);
			if (!this.active || this.previewComponent !== renderComponent) {
				return;
			}

			await MarkdownRenderer.render(
				this.options.app,
				markdown,
				markdownEl,
				this.options.file.path,
				renderComponent,
			);
			highlightRenderedText(markdownEl, this.options.highlightText);
		} catch {
			if (this.active && this.previewComponent === renderComponent) {
				markdownEl.setText('This note could not be rendered.');
			}
		} finally {
			if (
				this.active &&
				!this.editing &&
				this.previewComponent === renderComponent
			) {
				this.editButton?.setDisabled(false);
			}
		}
	}

	private removePreviewComponent(): void {
		if (this.previewComponent) {
			this.removeChild(this.previewComponent);
			this.previewComponent = null;
		}
	}

	private removeQuickEditor(): void {
		if (this.quickEditor) {
			this.removeChild(this.quickEditor);
			this.quickEditor = null;
		}
	}

	private endQuickEdit(notify = true): void {
		if (this.editing) {
			this.editing = false;
			if (notify) {
				this.options.onQuickEditEnd();
			}
		}
	}
}
