import {
	ButtonComponent,
	Component,
	MarkdownRenderer,
	type App,
	type TFile,
} from 'obsidian';

type NoteCardOptions = {
	app: App;
	file: TFile;
	parentEl: HTMLElement;
	onHeightChanged: (height: number) => void;
	onOpen: (file: TFile) => void;
};

export class NoteCard extends Component {
	readonly containerEl: HTMLElement;

	private active = false;
	private resizeObserver: ResizeObserver | null = null;

	constructor(private readonly options: NoteCardOptions) {
		super();
		this.containerEl = options.parentEl.createDiv({
			cls: 'doom-scroll-note',
			attr: { 'data-path': options.file.path },
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
			.setIcon('file-text')
			.setTooltip('Open note')
			.onClick(() => this.options.onOpen(this.options.file));
		new ButtonComponent(actionsEl)
			.setButtonText('Edit / exit here')
			.setIcon('pencil')
			.onClick(() => this.options.onOpen(this.options.file));

		const markdownEl = this.containerEl.createDiv({
			cls: ['doom-scroll-note-content', 'markdown-rendered'],
		});

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
