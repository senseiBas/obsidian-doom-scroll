import {
	ButtonComponent,
	Component,
	Notice,
	TextAreaComponent,
	type App,
	type TFile,
} from 'obsidian';
import { decideQuickEditSave } from '../editor/quick-edit-save';

type QuickEditPanelOptions = {
	app: App;
	file: TFile;
	parentEl: HTMLElement;
	original: string;
	onCancel: () => void;
	onSaved: () => void;
	onSavedAndOpen: () => void;
};

class QuickEditConflictError extends Error {}

export class QuickEditPanel extends Component {
	private readonly containerEl: HTMLElement;
	private textArea: TextAreaComponent | null = null;
	private actionButtons: ButtonComponent[] = [];
	private saving = false;

	constructor(private readonly options: QuickEditPanelOptions) {
		super();
		this.containerEl = options.parentEl.createDiv('doom-scroll-quick-edit');
	}

	override onload(): void {
		this.textArea = new TextAreaComponent(this.containerEl)
			.setValue(this.options.original)
			.setPlaceholder('Edit Markdown…');
		this.textArea.inputEl.addClass('doom-scroll-quick-edit-input');
		this.textArea.inputEl.spellcheck = true;

		const actionsEl = this.containerEl.createDiv(
			'doom-scroll-quick-edit-actions',
		);
		const saveButton = new ButtonComponent(actionsEl)
			.setButtonText('Save')
			.setIcon('save')
			.setCta()
			.onClick(() => {
				void this.save(false);
			});
		const cancelButton = new ButtonComponent(actionsEl)
			.setButtonText('Cancel')
			.setIcon('x')
			.onClick(() => this.options.onCancel());
		const openButton = new ButtonComponent(actionsEl)
			.setButtonText('Save & open full editor')
			.setIcon('pencil')
			.onClick(() => {
				void this.save(true);
			});
		this.actionButtons = [saveButton, cancelButton, openButton];

		const inputEl = this.textArea.inputEl;
		inputEl.focus();
		inputEl.setSelectionRange(inputEl.value.length, inputEl.value.length);
	}

	override onunload(): void {
		this.textArea = null;
		this.actionButtons = [];
		this.containerEl.remove();
	}

	private async save(openFullEditor: boolean): Promise<void> {
		if (this.saving || !this.textArea) {
			return;
		}
		const draft = this.textArea.getValue();
		if (draft === this.options.original) {
			this.finishSave(openFullEditor);
			return;
		}

		this.setSaving(true);
		try {
			await this.options.app.vault.process(this.options.file, (current) => {
				const decision = decideQuickEditSave(
					this.options.original,
					current,
					draft,
				);
				if (decision === 'conflict') {
					throw new QuickEditConflictError();
				}
				return decision === 'save' ? draft : current;
			});
			this.finishSave(openFullEditor);
		} catch (error) {
			if (error instanceof QuickEditConflictError) {
				new Notice(
					'This note changed elsewhere. Quick edit did not overwrite it.',
				);
			} else {
				new Notice('Quick edit could not save this note.');
			}
			this.setSaving(false);
		}
	}

	private finishSave(openFullEditor: boolean): void {
		if (openFullEditor) {
			this.options.onSavedAndOpen();
		} else {
			this.options.onSaved();
		}
	}

	private setSaving(saving: boolean): void {
		this.saving = saving;
		for (const button of this.actionButtons) {
			button.setDisabled(saving);
		}
	}
}
