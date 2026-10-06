import { useSyncExternalStore } from 'react';

export type Route = 'home' | 'tender' | 'sample';

const PATHS: Record<Route, string> = { home: '/', tender: '/tender', sample: '/sample' };
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');
const CHANGE_EVENT = 'dakhil:route';

export const hrefOf = (route: Route): string => BASE + PATHS[route];

/** Maps a URL path to a page, or null when it is not one of ours. */
export function routeOfPath(pathname: string, base = BASE): Route | null {
  const rest = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const name = rest.replace(/^\/+|\/+$/g, '').split('/')[0];
  if (name === '' || name === 'index.html') return 'home';
  return name === 'tender' || name === 'sample' ? name : null;
}

const currentRoute = (): Route => routeOfPath(window.location.pathname) ?? 'home';

function subscribe(onChange: () => void): () => void {
  // An old "#/sample" link followed inside an open tab only changes the hash.
  const onHash = () => {
    normalizeLocation();
    onChange();
  };
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onHash);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onHash);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, currentRoute);
}

export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const href = hrefOf(route);
  if (window.location.pathname !== href || window.location.hash) {
    if (options.replace) window.history.replaceState(null, '', href);
    else window.history.pushState(null, '', href);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Run once before the first render: old "#/sample" links keep working, and
 * unknown or untidy paths ("/sample/", "/nope") settle on a real page.
 */
export function normalizeLocation(): void {
  const { pathname, hash } = window.location;
  const legacy = /^#\/(\w*)\/?$/.exec(hash);
  const route = legacy ? (routeOfPath(`/${legacy[1]}`, '') ?? 'home') : (routeOfPath(pathname) ?? 'home');
  if (legacy || pathname !== hrefOf(route)) window.history.replaceState(null, '', hrefOf(route));
}

/**
 * Document-level click handler: in-app links change the page without a reload,
 * which would throw away the files the user has loaded.
 */
export function handleLinkClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest('a') : null;
  if (!link || link.target || link.hasAttribute('download')) return;
  if (!/^https?:$/.test(link.protocol) || link.origin !== window.location.origin) return;
  if (link.hash && link.pathname === window.location.pathname) return;
  const route = routeOfPath(link.pathname);
  if (!route) return;
  event.preventDefault();
  navigate(route);
}
