import { FuzzySuggestModal, type App } from 'obsidian';

type TagAction =
	| { kind: 'open'; label: string }
	| { kind: 'feed'; label: string };

export class TagJunctionModal extends FuzzySuggestModal<TagAction> {
	private readonly items: TagAction[];

	constructor(
		app: App,
		tag: string,
		private readonly onOpenNormally: () => void,
		private readonly onStartFeed: () => void,
		allowDoomScroll = true,
	) {
		super(app);
		this.items = [
			{ kind: 'open', label: 'Open tag normally' },
			...(allowDoomScroll
				? [{ kind: 'feed' as const, label: `Doom scroll: Tag ${tag}` }]
				: []),
		];
		this.setPlaceholder('Choose what to do with this tag…');
	}

	getItems(): TagAction[] {
		return this.items;
	}

	getItemText(item: TagAction): string {
		return item.label;
	}

	onChooseItem(item: TagAction): void {
		if (item.kind === 'open') {
			this.onOpenNormally();
		} else {
			this.onStartFeed();
		}
	}
}
