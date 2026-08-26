export type ExcludedFolderRule = {
	path: string;
	includeSubfolders: boolean;
};

export type DoomScrollSettings = {
	excludedFolders: ExcludedFolderRule[];
};

export const DEFAULT_SETTINGS: DoomScrollSettings = {
	excludedFolders: [],
};

export function normalizeSettings(value: unknown): DoomScrollSettings {
	if (!value || typeof value !== 'object') {
		return { excludedFolders: [] };
	}
	const candidate = value as Partial<DoomScrollSettings>;
	if (!Array.isArray(candidate.excludedFolders)) {
		return { excludedFolders: [] };
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
	return { excludedFolders };
}

export function normalizeFolderPath(path: string): string {
	return path.replace(/^\/+|\/+$/gu, '');
}
