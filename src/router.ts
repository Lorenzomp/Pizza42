export type Route = 'home' | 'cart' | 'profile' | 'success';

export function getRouteFromHash(hash: string): Route {
  const normalized = hash.replace(/^#/, '').trim();
  const path = normalized.startsWith('/') ? normalized : `/${normalized}`;

  if (path === '/cart') return 'cart';
  if (path === '/profile') return 'profile';
  if (path === '/success') return 'success';
  return 'home';
}

export function navigateTo(route: Route) {
  const hash = route === 'home' ? '#/' : `#/${route}`;
  if (window.location.hash !== hash) window.location.hash = hash;
}
