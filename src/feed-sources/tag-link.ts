export function normalizeRenderedTag(value: string | null): string | null {
	if (!value) {
		return null;
	}
	let decoded: string;
	try {
		decoded = decodeURIComponent(value);
	} catch {
		decoded = value;
	}
	const tag = decoded.trim().replace(/^#+/u, '');
	return tag.length > 0 ? `#${tag}` : null;
}
