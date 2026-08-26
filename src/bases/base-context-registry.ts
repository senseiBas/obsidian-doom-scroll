import type { BaseFeedState } from '../types/feed';

export type BaseContextSnapshot = {
	label: string;
	paths: string[];
};

export class BaseContextRegistry {
	private readonly contexts = new Map<string, BaseContextSnapshot>();
	private nextId = 1;

	create(label: string, paths: string[], anchorPath: string): BaseFeedState {
		const contextId = `base-${this.nextId}`;
		this.nextId += 1;
		this.update(contextId, label, paths);
		return { source: 'base', anchorPath, contextId, label };
	}

	update(contextId: string, label: string, paths: string[]): void {
		this.contexts.set(contextId, { label, paths: [...paths] });
	}

	get(contextId: string): BaseContextSnapshot | null {
		const context = this.contexts.get(contextId);
		return context
			? { label: context.label, paths: [...context.paths] }
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
