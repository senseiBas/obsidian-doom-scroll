import type { TextSearchFeedState } from '../types/feed';

export type TextSearchContextSnapshot = {
	query: string;
	paths: string[];
};

export class TextSearchContextRegistry {
	private readonly contexts = new Map<string, TextSearchContextSnapshot>();
	private nextId = 1;

	create(
		query: string,
		paths: string[],
		anchorPath: string,
	): TextSearchFeedState {
		const contextId = `text-${this.nextId}`;
		this.nextId += 1;
		this.contexts.set(contextId, { query, paths: [...paths] });
		return { source: 'text', anchorPath, contextId, query };
	}

	get(contextId: string): TextSearchContextSnapshot | null {
		const context = this.contexts.get(contextId);
		return context
			? { query: context.query, paths: [...context.paths] }
			: null;
	}

	renamePath(oldPath: string, newPath: string): void {
		for (const context of this.contexts.values()) {
			context.paths = context.paths.map((path) =>
				path === oldPath ? newPath : path,
			);
		}
	}

	clear(): void {
		this.contexts.clear();
	}
}
