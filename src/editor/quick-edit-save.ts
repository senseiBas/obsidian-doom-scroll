export type QuickEditSaveDecision = 'unchanged' | 'save' | 'conflict';

export function decideQuickEditSave(
	original: string,
	current: string,
	draft: string,
): QuickEditSaveDecision {
	if (draft === original) {
		return 'unchanged';
	}
	return current === original ? 'save' : 'conflict';
}
