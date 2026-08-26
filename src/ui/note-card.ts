import {
	ButtonComponent,
	Component,
	MarkdownRenderer,
	type App,
	type TFile,
} from 'obsidian';
import { normalizeRenderedTag } from '../feed-sources/tag-link';

type NoteCardOptions = {
	app: App;
	file: TFile;
	parentEl: HTMLElement;
	onHeightChanged: (height: number) => void;
	onInternalLink: (sourceFile: TFile, linkText: string) => void;
	onTagLink: (
		sourceFile: TFile,
		tag: string,
		openNormally: () => void,
	) => void;
	onEdit: (file: TFile) => void;
	onOpenNormally: (file: TFile) => void;
};

export class NoteCard extends Component {
	readonly containerEl: HTMLElement;

	private active = false;
	private resizeObserver: ResizeObserver | null = null;
	private readonly passThroughTags = new WeakSet<HTMLElement>();

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
		headerEl.createDiv({
			cls: 'doom-scroll-note-title',
			text: this.options.file.basename,
		});

		const actionsEl = headerEl.createDiv('doom-scroll-note-actions');
		new ButtonComponent(actionsEl)
			.setButtonText('Open')
			.setIcon('file-text')
			.setTooltip('Open note')
			.onClick(() => this.options.onOpenNormally(this.options.file));
		new ButtonComponent(actionsEl)
			.setButtonText('Edit / exit here')
			.setIcon('pencil')
			.onClick(() => this.options.onEdit(this.options.file));

		const markdownEl = this.containerEl.createDiv({
			cls: ['doom-scroll-note-content', 'markdown-rendered'],
		});
		this.registerDomEvent(
			markdownEl,
			'click',
			(event) => {
				if (event.button !== 0) {
					return;
				}
				const target = event.target as Element | null;
				const tagEl = target?.closest?.('a.tag') as HTMLElement | null;
				if (tagEl && markdownEl.contains(tagEl)) {
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
				if (!linkEl || !markdownEl.contains(linkEl)) {
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

		void this.renderMarkdown(markdownEl);
	}

	override onunload(): void {
		this.active = false;
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.containerEl.remove();
	}

	private async renderMarkdown(markdownEl: HTMLElement): Promise<void> {
		try {
			const markdown = await this.options.app.vault.cachedRead(
				this.options.file,
			);
			if (!this.active) {
				return;
			}

			await MarkdownRenderer.render(
				this.options.app,
				markdown,
				markdownEl,
				this.options.file.path,
				this,
			);
		} catch {
			if (this.active) {
				markdownEl.setText('This note could not be rendered.');
			}
		}
	}
}
