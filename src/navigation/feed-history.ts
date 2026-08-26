export type FeedHistoryEntry<TContext> = {
	context: TContext;
	scrollTop: number | null;
};

export class FeedHistory<TContext> {
	private entries: FeedHistoryEntry<TContext>[];
	private index = 0;

	constructor(initialContext: TContext) {
		this.entries = [{ context: initialContext, scrollTop: null }];
	}

	get current(): FeedHistoryEntry<TContext> {
		const entry = this.entries[this.index];
		if (!entry) {
			throw new Error('Feed history has no current entry.');
		}
		return entry;
	}

	get canGoBack(): boolean {
		return this.index > 0;
	}

	get canGoForward(): boolean {
		return this.index < this.entries.length - 1;
	}

	saveScroll(scrollTop: number): void {
		this.current.scrollTop = scrollTop;
	}

	updateContexts(mapper: (context: TContext) => TContext): void {
		this.entries = this.entries.map((entry) => ({
			...entry,
			context: mapper(entry.context),
		}));
	}

	navigate(context: TContext, currentScrollTop: number): FeedHistoryEntry<TContext> {
		this.saveScroll(currentScrollTop);
		this.entries = this.entries.slice(0, this.index + 1);
		this.entries.push({ context, scrollTop: null });
		this.index += 1;
		return this.current;
	}

	back(currentScrollTop: number): FeedHistoryEntry<TContext> | null {
		if (!this.canGoBack) {
			return null;
		}
		this.saveScroll(currentScrollTop);
		this.index -= 1;
		return this.current;
	}

	forward(currentScrollTop: number): FeedHistoryEntry<TContext> | null {
		if (!this.canGoForward) {
			return null;
		}
		this.saveScroll(currentScrollTop);
		this.index += 1;
		return this.current;
	}
}
