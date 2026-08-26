export type VaultFileDescriptor = {
	path: string;
	basename: string;
	extension: string;
};

export type OrderedFolderFeed<TFile extends VaultFileDescriptor> = {
	files: TFile[];
	anchorIndex: number;
};

const naturalCollator = new Intl.Collator('en', {
	numeric: true,
	sensitivity: 'base',
});

function normalizeFolderPath(path: string): string {
	return path.replace(/^\/+|\/+$/g, '');
}

function getParentPath(path: string): string {
	const lastSeparator = path.lastIndexOf('/');
	return lastSeparator < 0 ? '' : path.slice(0, lastSeparator);
}

function isInsideFolder(
	filePath: string,
	folderPath: string,
	recursive: boolean,
): boolean {
	const normalizedFolder = normalizeFolderPath(folderPath);
	const parentPath = getParentPath(filePath);

	if (!recursive) {
		return parentPath === normalizedFolder;
	}

	if (normalizedFolder.length === 0) {
		return true;
	}

	return (
		parentPath === normalizedFolder ||
		parentPath.startsWith(`${normalizedFolder}/`)
	);
}

export function compareVaultFilesNaturally(
	left: VaultFileDescriptor,
	right: VaultFileDescriptor,
): number {
	const basenameResult = naturalCollator.compare(left.basename, right.basename);
	return basenameResult !== 0
		? basenameResult
		: naturalCollator.compare(left.path, right.path);
}

export function orderVaultFilesNaturally<
	TFile extends VaultFileDescriptor,
>(files: readonly TFile[]): TFile[] {
	return files.slice().sort(compareVaultFilesNaturally);
}

export function orderFolderFeed<TFile extends VaultFileDescriptor>(
	files: readonly TFile[],
	anchorPath: string,
	recursive: boolean,
): OrderedFolderFeed<TFile> {
	const anchor = files.find((file) => file.path === anchorPath);
	if (!anchor) {
		return { files: [], anchorIndex: -1 };
	}

	const folderPath = getParentPath(anchor.path);
	const orderedFiles = orderFolderFiles(files, folderPath, recursive);

	return {
		files: orderedFiles,
		anchorIndex: orderedFiles.findIndex((file) => file.path === anchorPath),
	};
}

export function orderFolderFiles<TFile extends VaultFileDescriptor>(
	files: readonly TFile[],
	folderPath: string,
	recursive: boolean,
): TFile[] {
	return files
		.filter(
			(file) =>
				file.extension.toLocaleLowerCase() === 'md' &&
				isInsideFolder(file.path, folderPath, recursive),
		)
		.slice()
		.sort(compareVaultFilesNaturally);
}
