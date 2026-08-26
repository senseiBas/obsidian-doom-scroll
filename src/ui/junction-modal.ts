import { FuzzySuggestModal, type App, type TFile } from 'obsidian';
import type { DoomScrollViewState } from '../types/feed';
import { buildFeedSourceChoices } from './source-picker-modal';

type JunctionAction =
	| { kind: 'open'; label: string }
	| { kind: 'feed'; label: string; state: DoomScrollViewState };

export class JunctionModal extends FuzzySuggestModal<JunctionAction> {
	private readonly items: JunctionAction[];

	constructor(
		app: App,
		linkedFile: TFile,
		private readonly onOpenNormally: () => void,
		private readonly onStartFeed: (state: DoomScrollViewState) => void,
	) {
		super(app);
		this.items = [
			{ kind: 'open', label: 'Open note normally' },
			...buildFeedSourceChoices(app, linkedFile).map((choice) => ({
				kind: 'feed' as const,
				label: `Doom scroll: ${choice.label}`,
				state: choice.state,
			})),
		];
		this.setPlaceholder('Choose what to do with this link…');
	}

	getItems(): JunctionAction[] {
		return this.items;
	}

	getItemText(item: JunctionAction): string {
		return item.label;
	}

	onChooseItem(item: JunctionAction): void {
		if (item.kind === 'open') {
			this.onOpenNormally();
		} else {
			this.onStartFeed(item.state);
		}
	}
}
