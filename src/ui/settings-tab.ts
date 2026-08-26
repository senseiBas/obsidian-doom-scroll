import {
	Notice,
	PluginSettingTab,
	Setting,
	type App,
	type Plugin,
} from 'obsidian';
import {
	normalizeFolderPath,
	type DoomScrollSettings,
} from '../settings';
import { FolderSuggestModal } from './folder-suggest-modal';

export type SettingsController = Plugin & {
	settings: DoomScrollSettings;
	saveSettings: () => Promise<void>;
};

export class DoomScrollSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly controller: SettingsController,
	) {
		super(app, controller);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Excluded folders')
			.setDesc(
				'Hide these folders from folder, tag, outgoing-link, and backlink feeds. Base views keep their own exact results.',
			)
			.setHeading();

		for (const [
			index,
			rule,
		] of this.controller.settings.excludedFolders.entries()) {
			new Setting(containerEl)
				.setName(rule.path || 'Vault root')
				.setDesc('Also exclude subfolders')
				.addToggle((toggle) =>
					toggle
						.setValue(rule.includeSubfolders)
						.onChange(async (value) => {
							rule.includeSubfolders = value;
							await this.controller.saveSettings();
						}),
				)
				.addExtraButton((button) =>
					button
						.setIcon('trash-2')
						.setTooltip('Remove excluded folder')
						.onClick(async () => {
							this.controller.settings.excludedFolders.splice(index, 1);
							await this.controller.saveSettings();
							this.display();
						}),
				);
		}

		new Setting(containerEl)
			.setName('Add excluded folder')
			.setDesc('Choose a folder from this vault.')
			.addButton((button) =>
				button.setButtonText('Choose folder…').onClick(() => {
					new FolderSuggestModal(
						this.app,
						'Choose a folder to exclude…',
						(folder) => {
							void this.addFolder(folder.path);
						},
					).open();
				}),
			);
	}

	private async addFolder(path: string): Promise<void> {
		const normalizedPath = normalizeFolderPath(path);
		if (
			this.controller.settings.excludedFolders.some(
				(rule) => rule.path === normalizedPath,
			)
		) {
			new Notice('This folder is already excluded.');
			return;
		}
		this.controller.settings.excludedFolders.push({
			path: normalizedPath,
			includeSubfolders: true,
		});
		await this.controller.saveSettings();
		this.display();
	}
}
