import { useSyncExternalStore } from 'react';

export type Route = 'home' | 'tender' | 'sample';

// Hash routes need no server rewrites, so the app works on any static host.
const HREFS: Record<Route, string> = { home: '#/', tender: '#/tender', sample: '#/sample' };

export const hrefOf = (route: Route): string => HREFS[route];

/** Anything unrecognised falls back to home, so there are no dead URLs. */
function currentRoute(): Route {
  const name = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return name === 'tender' || name === 'sample' ? name : 'home';
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, currentRoute);
}

export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  if (options.replace) window.location.replace(hrefOf(route));
  else window.location.hash = hrefOf(route);
}
