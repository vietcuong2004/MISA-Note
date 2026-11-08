import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { BrowserRouter } from './browserRouter';
import { viewForLocation } from './routes';

export function useAppRouter() {
  const [router] = useState(() => new BrowserRouter(window));
  const location = useSyncExternalStore(router.subscribe, router.getSnapshot, router.getSnapshot);
  const view = useMemo(() => viewForLocation(location), [location]);
  useEffect(() => { router.canonicalize(); }, [router, location]);
  return { view, navigate: router.navigate };
}
