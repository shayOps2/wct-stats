import '@testing-library/jest-dom/vitest';

const DEFAULT_VIEWPORT_WIDTH = 1280;
const mediaQueryEntries = new Set();
let viewportWidth = DEFAULT_VIEWPORT_WIDTH;

const evaluateMediaQuery = (query) => {
	const minWidthMatches = [...query.matchAll(/\(min-width:\s*(\d+)px\)/g)];
	const maxWidthMatches = [...query.matchAll(/\(max-width:\s*(\d+)px\)/g)];

	return minWidthMatches.every(([, minWidth]) => viewportWidth >= Number(minWidth))
		&& maxWidthMatches.every(([, maxWidth]) => viewportWidth <= Number(maxWidth));
};

const notifyMediaQueryChange = (entry) => {
	const nextMatch = evaluateMediaQuery(entry.query);

	if (nextMatch === entry.matches) {
		return;
	}

	entry.matches = nextMatch;

	const event = {
		matches: nextMatch,
		media: entry.query,
	};

	if (typeof entry.onchange === 'function') {
		entry.onchange(event);
	}

	entry.listeners.forEach((listener) => listener(event));
	entry.legacyListeners.forEach((listener) => listener(event));
};

const applyViewportWidth = (width) => {
	viewportWidth = width;

	Object.defineProperty(window, 'innerWidth', {
		configurable: true,
		writable: true,
		value: width,
	});

	Object.defineProperty(window, 'outerWidth', {
		configurable: true,
		writable: true,
		value: width,
	});

	window.dispatchEvent(new Event('resize'));
	mediaQueryEntries.forEach(notifyMediaQueryChange);
};

export const setViewportWidth = (width) => {
	applyViewportWidth(width);
};

export const resetViewportWidth = () => {
	applyViewportWidth(DEFAULT_VIEWPORT_WIDTH);
};

export const MOBILE_VIEWPORT_WIDTH = 375;
export const DESKTOP_VIEWPORT_WIDTH = DEFAULT_VIEWPORT_WIDTH;

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query) => {
		const entry = {
			query,
			matches: evaluateMediaQuery(query),
			listeners: new Set(),
			legacyListeners: new Set(),
			onchange: null,
		};

		const mediaQueryList = {
			get matches() {
				return entry.matches;
			},
			media: query,
			get onchange() {
				return entry.onchange;
			},
			set onchange(listener) {
				entry.onchange = listener;
			},
			addListener: (listener) => {
				entry.legacyListeners.add(listener);
			},
			removeListener: (listener) => {
				entry.legacyListeners.delete(listener);
			},
			addEventListener: (type, listener) => {
				if (type === 'change') {
					entry.listeners.add(listener);
				}
			},
			removeEventListener: (type, listener) => {
				if (type === 'change') {
					entry.listeners.delete(listener);
				}
			},
			dispatchEvent: (event) => {
				entry.listeners.forEach((listener) => listener(event));
				entry.legacyListeners.forEach((listener) => listener(event));

				if (typeof entry.onchange === 'function') {
					entry.onchange(event);
				}

				return true;
			},
		};

		mediaQueryEntries.add(entry);
		return mediaQueryList;
	},
});

beforeEach(() => {
	resetViewportWidth();
});
