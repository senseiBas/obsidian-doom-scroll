export type ExcludedFolderRule = {
	path: string;
	includeSubfolders: boolean;
};

export type DoomScrollSettings = {
	excludedFolders: ExcludedFolderRule[];
	openInSidePane: boolean;
};

export const DEFAULT_SETTINGS: DoomScrollSettings = {
	excludedFolders: [],
	openInSidePane: true,
};

export function normalizeSettings(value: unknown): DoomScrollSettings {
	if (!value || typeof value !== 'object') {
		return { ...DEFAULT_SETTINGS };
	}
	const candidate = value as Partial<DoomScrollSettings>;
	const openInSidePane =
		typeof candidate.openInSidePane === 'boolean'
			? candidate.openInSidePane
			: DEFAULT_SETTINGS.openInSidePane;
	if (!Array.isArray(candidate.excludedFolders)) {
		return { excludedFolders: [], openInSidePane };
	}

	const seen = new Set<string>();
	const excludedFolders: ExcludedFolderRule[] = [];
	for (const rule of candidate.excludedFolders) {
		if (
			!rule ||
			typeof rule !== 'object' ||
			typeof rule.path !== 'string' ||
			typeof rule.includeSubfolders !== 'boolean'
		) {
			continue;
		}
		const path = normalizeFolderPath(rule.path);
		if (!seen.has(path)) {
			seen.add(path);
			excludedFolders.push({ path, includeSubfolders: rule.includeSubfolders });
		}
	}
	return { excludedFolders, openInSidePane };
}

export function normalizeFolderPath(path: string): string {
	return path.replace(/^\/+|\/+$/gu, '');
}
