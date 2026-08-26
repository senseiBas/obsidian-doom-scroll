export type VirtualOffsets = {
	offsets: number[];
	totalHeight: number;
};

export function buildVirtualOffsets(
	itemCount: number,
	getHeight: (index: number) => number | undefined,
	estimatedHeight: number,
): VirtualOffsets {
	const offsets = new Array<number>(itemCount + 1);
	offsets[0] = 0;

	for (let index = 0; index < itemCount; index += 1) {
		const measuredHeight = getHeight(index);
		const height =
			measuredHeight !== undefined && measuredHeight > 0
				? measuredHeight
				: estimatedHeight;
		offsets[index + 1] = (offsets[index] ?? 0) + height;
	}

	return {
		offsets,
		totalHeight: offsets[itemCount] ?? 0,
	};
}

export function findIndexAtOffset(
	offsets: readonly number[],
	offset: number,
): number {
	const itemCount = Math.max(0, offsets.length - 1);
	if (itemCount === 0) {
		return -1;
	}

	const totalHeight = offsets[itemCount] ?? 0;
	const target = Math.max(0, Math.min(offset, Math.max(0, totalHeight - 1)));
	let low = 0;
	let high = itemCount - 1;

	while (low <= high) {
		const middle = Math.floor((low + high) / 2);
		const start = offsets[middle] ?? 0;
		const end = offsets[middle + 1] ?? totalHeight;

		if (target < start) {
			high = middle - 1;
		} else if (target >= end) {
			low = middle + 1;
		} else {
			return middle;
		}
	}

	return Math.max(0, Math.min(low, itemCount - 1));
}
