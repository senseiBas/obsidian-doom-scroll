import { describe, expect, it } from 'vitest';
import {
	buildVirtualOffsets,
	findIndexAtOffset,
} from '../src/virtualization/height-model';

describe('virtual height model', () => {
	it('combines measured and estimated item heights', () => {
		const measured = new Map([
			[0, 100],
			[2, 300],
		]);
		const model = buildVirtualOffsets(3, (index) => measured.get(index), 200);

		expect(model.offsets).toEqual([0, 100, 300, 600]);
		expect(model.totalHeight).toBe(600);
	});

	it('finds the item containing an offset and clamps boundaries', () => {
		const offsets = [0, 100, 300, 600];
		expect(findIndexAtOffset(offsets, -20)).toBe(0);
		expect(findIndexAtOffset(offsets, 99)).toBe(0);
		expect(findIndexAtOffset(offsets, 100)).toBe(1);
		expect(findIndexAtOffset(offsets, 599)).toBe(2);
		expect(findIndexAtOffset(offsets, 999)).toBe(2);
	});

	it('handles an empty feed', () => {
		expect(findIndexAtOffset([0], 0)).toBe(-1);
	});
});
