import { describe, expect, it } from 'vitest';
import { FeedHistory } from '../src/navigation/feed-history';

describe('FeedHistory', () => {
	it('restores saved scroll positions through back and forward', () => {
		const history = new FeedHistory('folder');
		history.navigate('outgoing', 320);
		history.saveScroll(840);

		expect(history.back(840)).toEqual({
			context: 'folder',
			scrollTop: 320,
		});
		expect(history.forward(320)).toEqual({
			context: 'outgoing',
			scrollTop: 840,
		});
	});

	it('discards the forward branch after new navigation', () => {
		const history = new FeedHistory('folder');
		history.navigate('outgoing', 10);
		history.navigate('backlinks', 20);
		history.back(30);
		history.navigate('tag', 25);

		expect(history.current.context).toBe('tag');
		expect(history.canGoForward).toBe(false);
		expect(history.canGoBack).toBe(true);
	});

	it('does nothing at history boundaries', () => {
		const history = new FeedHistory('folder');
		expect(history.back(0)).toBeNull();
		history.navigate('outgoing', 0);
		expect(history.forward(0)).toBeNull();
	});
});
