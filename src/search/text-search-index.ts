import type { App, TFile } from 'obsidian';
import { isFileExcluded } from '../feed-sources/folder-exclusions';
import { orderVaultFilesNaturally } from '../feed-sources/folder-order';
import type { ExcludedFolderRule } from '../settings';
import { normalizeSearchableText } from './text-match';

type CachedSearchText = {
	mtime: number;
	size: number;
	text: string;
};

const SEARCH_READ_CONCURRENCY = 8;

export class TextSearchIndex {
	private readonly cache = new Map<string, CachedSearchText>();

	constructor(private readonly app: App) {}

	async search(
		query: string,
		excludedFolders: readonly ExcludedFolderRule[],
	): Promise<TFile[]> {
		const allFiles = this.app.vault.getMarkdownFiles();
		const currentPaths = new Set(allFiles.map((file) => file.path));
		for (const path of this.cache.keys()) {
			if (!currentPaths.has(path)) {
				this.cache.delete(path);
			}
		}

		const files = orderVaultFilesNaturally(
			allFiles.filter(
				(file) => !isFileExcluded(file.path, excludedFolders),
			),
		);
		const needle = normalizeSearchableText(query);
		const matches = new Array<boolean>(files.length).fill(false);
		let nextIndex = 0;

		const readWorker = async (): Promise<void> => {
			while (nextIndex < files.length) {
				const index = nextIndex;
				nextIndex += 1;
				const file = files[index];
				if (!file) {
					continue;
				}
				if (
					normalizeSearchableText(file.basename).includes(needle)
				) {
					matches[index] = true;
					continue;
				}
				try {
					const searchableText = await this.getSearchableText(file);
					matches[index] = searchableText.includes(needle);
				} catch {
					matches[index] = false;
				}
			}
		};

		const workerCount = Math.min(SEARCH_READ_CONCURRENCY, files.length);
		await Promise.all(
			Array.from({ length: workerCount }, () => readWorker()),
		);
		return files.filter((_file, index) => matches[index]);
	}

	clear(): void {
		this.cache.clear();
	}

	private async getSearchableText(file: TFile): Promise<string> {
		const cached = this.cache.get(file.path);
		if (
			cached &&
			cached.mtime === file.stat.mtime &&
			cached.size === file.stat.size
		) {
			return cached.text;
		}

		const content = await this.app.vault.cachedRead(file);
		const text = normalizeSearchableText(content);
		this.cache.set(file.path, {
			mtime: file.stat.mtime,
			size: file.stat.size,
			text,
		});
		return text;
	}
}
