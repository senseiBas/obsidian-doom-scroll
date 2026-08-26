import { FuzzySuggestModal, type App, type TFile } from 'obsidian';
import { getExactTags } from '../feed-sources/related-feed-source';
import type { DoomScrollViewState } from '../types/feed';
import { FolderPickerModal } from './folder-picker-modal';

export type FeedSourceChoice = {
	label: string;
	state: DoomScrollViewState;
};

type SourcePickerChoice =
	| FeedSourceChoice
	| { label: string; action: 'choose-folder' };

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

export class SourcePickerModal extends FuzzySuggestModal<SourcePickerChoice> {
	private readonly items: SourcePickerChoice[];

	constructor(
		app: App,
		anchor: TFile,
		private readonly onChoose: (state: DoomScrollViewState) => void,
	) {
		super(app);
		this.items = [
			...buildFeedSourceChoices(app, anchor),
			{ label: 'Choose a folder…', action: 'choose-folder' },
		];
		this.setPlaceholder('Choose a doom scroll feed source…');
	}

	getItems(): SourcePickerChoice[] {
		return this.items;
	}

	getItemText(item: SourcePickerChoice): string {
		return item.label;
	}

	onChooseItem(item: SourcePickerChoice): void {
		if ('action' in item) {
			new FolderPickerModal(this.app, this.onChoose).open();
			return;
		}
		this.onChoose(item.state);
	}
}
