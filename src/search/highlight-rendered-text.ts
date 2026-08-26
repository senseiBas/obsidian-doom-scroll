import { splitTextMatches } from './text-match';

const SHOW_TEXT = 4;

export function highlightRenderedText(
	rootEl: HTMLElement,
	query: string | undefined,
): void {
	if (!query) {
		return;
	}

	const document = rootEl.ownerDocument;
	const walker = document.createTreeWalker(rootEl, SHOW_TEXT);
	const textNodes: Text[] = [];
	let current = walker.nextNode();
	while (current) {
		textNodes.push(current as Text);
		current = walker.nextNode();
	}

	for (const textNode of textNodes) {
		const parentEl = textNode.parentElement;
		if (
			!parentEl ||
			parentEl.closest('mark.doom-scroll-search-match, script, style, textarea')
		) {
			continue;
		}
		const parts = splitTextMatches(textNode.data, query);
		if (!parts.some((part) => part.match)) {
			continue;
		}

		const fragment = document.createDocumentFragment();
		for (const part of parts) {
			if (part.match) {
				const markEl = document.createElement('mark');
				markEl.className = 'doom-scroll-search-match';
				markEl.textContent = part.text;
				fragment.appendChild(markEl);
			} else {
				fragment.appendChild(document.createTextNode(part.text));
			}
		}
		textNode.replaceWith(fragment);
	}
}
