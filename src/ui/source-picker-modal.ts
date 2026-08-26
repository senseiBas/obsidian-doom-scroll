import { FuzzySuggestModal, type App, type TFile } from 'obsidian';
import { getExactTags } from '../feed-sources/related-feed-source';
import type { DoomScrollViewState } from '../types/feed';

export type FeedSourceChoice = {
	label: string;
	state: DoomScrollViewState;
};

export function buildFeedSourceChoices(
	app: App,
	anchor: TFile,
): FeedSourceChoice[] {
	const choices: FeedSourceChoice[] = [
		{
			label: 'This folder',
			state: {
				source: 'folder',
				anchorPath: anchor.path,
				recursive: false,
			},
		},
		{
			label: 'This folder + subfolders',
			state: {
				source: 'folder',
				anchorPath: anchor.path,
				recursive: true,
			},
		},
		{
			label: 'Outgoing links',
			state: { source: 'outgoing', anchorPath: anchor.path },
		},
		{
			label: 'Backlinks',
			state: { source: 'backlinks', anchorPath: anchor.path },
		},
	];

	for (const tag of getExactTags(app, anchor)) {
		choices.push({
			label: `Tag: ${tag}`,
			state: { source: 'tag', anchorPath: anchor.path, tag },
		});
	}

	return choices;
}

export class SourcePickerModal extends FuzzySuggestModal<FeedSourceChoice> {
	private readonly items: FeedSourceChoice[];

	constructor(
		app: App,
		anchor: TFile,
		private readonly onChoose: (state: DoomScrollViewState) => void,
	) {
		super(app);
		this.items = buildFeedSourceChoices(app, anchor);
		this.setPlaceholder('Choose a doom scroll feed source…');
	}

	getItems(): FeedSourceChoice[] {
		return this.items;
	}

	getItemText(item: FeedSourceChoice): string {
		return item.label;
	}

	onChooseItem(item: FeedSourceChoice): void {
		this.onChoose(item.state);
	}
}
