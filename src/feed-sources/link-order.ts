export type PositionedLink = {
	link: string;
	position: {
		start: {
			offset: number;
		};
	};
};

export function resolveOutgoingPaths(
	anchorPath: string,
	references: readonly PositionedLink[],
	resolveLink: (link: string) => string | null,
	resolvedDestinationPaths: readonly string[] = [],
): string[] {
	const paths = [anchorPath];
	const seen = new Set(paths);
	const orderedReferences = references
		.slice()
		.sort(
			(left, right) =>
				left.position.start.offset - right.position.start.offset,
		);

	for (const reference of orderedReferences) {
		const path = resolveLink(reference.link);
		if (path && !seen.has(path)) {
			seen.add(path);
			paths.push(path);
		}
	}

	for (const path of resolvedDestinationPaths) {
		if (path && !seen.has(path)) {
			seen.add(path);
			paths.push(path);
		}
	}

	return paths;
}

export function resolveBacklinkPaths(
	anchorPath: string,
	resolvedLinks: Readonly<Record<string, Readonly<Record<string, number>>>>,
): string[] {
	const paths = [anchorPath];
	const seen = new Set(paths);

	for (const [sourcePath, destinations] of Object.entries(resolvedLinks)) {
		if ((destinations[anchorPath] ?? 0) > 0 && !seen.has(sourcePath)) {
			seen.add(sourcePath);
			paths.push(sourcePath);
		}
	}

	return paths;
}
