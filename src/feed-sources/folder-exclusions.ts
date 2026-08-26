import {
	normalizeFolderPath,
	type ExcludedFolderRule,
} from '../settings';

export function isFileExcluded(
	filePath: string,
	rules: readonly ExcludedFolderRule[],
): boolean {
	const folderPath = getParentPath(filePath);
	return rules.some((rule) => {
		const excludedPath = normalizeFolderPath(rule.path);
		if (folderPath === excludedPath) {
			return true;
		}
		if (!rule.includeSubfolders) {
			return false;
		}
		return excludedPath.length === 0
			? true
			: folderPath.startsWith(`${excludedPath}/`);
	});
}

export function filterExcludedFiles<TFile extends { path: string }>(
	files: readonly TFile[],
	anchorPath: string,
	rules: readonly ExcludedFolderRule[],
): { files: TFile[]; anchorIndex: number } | null {
	const includedFiles = files.filter(
		(file) => !isFileExcluded(file.path, rules),
	);
	const anchorIndex = includedFiles.findIndex(
		(file) => file.path === anchorPath,
	);
	return anchorIndex < 0 ? null : { files: includedFiles, anchorIndex };
}

export function renameExcludedFolderPaths(
	rules: readonly ExcludedFolderRule[],
	oldPath: string,
	newPath: string,
): ExcludedFolderRule[] {
	const normalizedOldPath = normalizeFolderPath(oldPath);
	const normalizedNewPath = normalizeFolderPath(newPath);
	return rules.map((rule) => {
		if (rule.path === normalizedOldPath) {
			return { ...rule, path: normalizedNewPath };
		}
		if (rule.path.startsWith(`${normalizedOldPath}/`)) {
			return {
				...rule,
				path: `${normalizedNewPath}${rule.path.slice(normalizedOldPath.length)}`,
			};
		}
		return rule;
	});
}

export function removeDeletedFolderPaths(
	rules: readonly ExcludedFolderRule[],
	deletedPath: string,
): ExcludedFolderRule[] {
	const normalizedPath = normalizeFolderPath(deletedPath);
	return rules.filter(
		(rule) =>
			rule.path !== normalizedPath &&
			!rule.path.startsWith(`${normalizedPath}/`),
	);
}

function getParentPath(path: string): string {
	const lastSeparator = path.lastIndexOf('/');
	return lastSeparator < 0 ? '' : path.slice(0, lastSeparator);
}
