export function normalizeSearchQuery(selection: string): string | null {
	const query = selection.trim().replace(/\s+/gu, ' ');
	return query.length > 0 ? query : null;
}

export function normalizeSearchableText(value: string): string {
	return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ');
}

export function containsSearchQuery(
	title: string,
	content: string,
	query: string,
): boolean {
	const needle = normalizeSearchableText(query);
	return (
		normalizeSearchableText(title).includes(needle) ||
		normalizeSearchableText(content).includes(needle)
	);
}

export type TextMatchPart = {
	text: string;
	match: boolean;
};

export function splitTextMatches(
	text: string,
	query: string,
): TextMatchPart[] {
	if (query.length === 0) {
		return [{ text, match: false }];
	}

	const tokens = query.trim().split(/\s+/gu).filter(Boolean);
	if (tokens.length === 0) {
		return [{ text, match: false }];
	}
	const pattern = tokens.map(escapeRegularExpression).join('\\s+');
	const expression = new RegExp(pattern, 'giu');
	const parts: TextMatchPart[] = [];
	let start = 0;
	for (const match of text.matchAll(expression)) {
		const matchIndex = match.index;
		const matchedText = match[0];
		if (matchIndex === undefined || !matchedText) {
			continue;
		}
		if (matchIndex > start) {
			parts.push({ text: text.slice(start, matchIndex), match: false });
		}
		const end = matchIndex + matchedText.length;
		parts.push({ text: text.slice(matchIndex, end), match: true });
		start = end;
	}

	if (start < text.length) {
		parts.push({ text: text.slice(start), match: false });
	}

	return parts.length > 0 ? parts : [{ text, match: false }];
}

function escapeRegularExpression(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
