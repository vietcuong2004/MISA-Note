import { ViewState } from '../../types';
import { pathForView, viewForLocation } from './routes';

export type BrowserNavigation = Pick<Window, 'history' | 'location' | 'addEventListener' | 'removeEventListener' | 'dispatchEvent'>;
const navigationEvent = 'misa:navigate';

/** Run once at page startup; refreshing discards session data and returns home. */
export function resetLocationAfterReload(browser: {
  performance: Pick<Performance, 'getEntriesByType'>;
  history: Pick<History, 'replaceState'>;
}) {
  const navigation = browser.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation?.type === 'reload') browser.history.replaceState(null, '', '/private');
}

/** Native History API navigation: one history entry per page change. */
export class BrowserRouter {
  constructor(private browser: BrowserNavigation) {}

  getSnapshot = () => this.browser.location.pathname + this.browser.location.search + this.browser.location.hash;

  subscribe = (listener: () => void) => {
    this.browser.addEventListener('popstate', listener);
    this.browser.addEventListener(navigationEvent, listener);
    return () => {
      this.browser.removeEventListener('popstate', listener);
      this.browser.removeEventListener(navigationEvent, listener);
    };
  };

  navigate = (view: ViewState, replace = false) => {
    const target = pathForView(view);
    if (target === this.getSnapshot()) return;
    this.browser.history[replace ? 'replaceState' : 'pushState'](null, '', target);
    this.browser.dispatchEvent(new Event(navigationEvent));
  };

  canonicalize = () => {
    const view = viewForLocation(this.getSnapshot());
    if (view.type === 'not_found') return;
    const target = pathForView(view);
    if (this.browser.location.pathname !== target || this.browser.location.hash.startsWith('#doc=')) {
      this.navigate(view, true);
    }
  };
}
