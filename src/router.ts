import { auth0Scopes } from './auth/scopes';

export type Route = 'home' | 'cart' | 'profile' | 'success';

type LoginWithRedirect = (options?: {
  authorizationParams?: {
    scope?: string;
    redirect_uri?: string;
  };
}) => void | Promise<void>;

type NavigateOptions = {
  loginWithRedirect?: LoginWithRedirect;
};

const protectedRouteScopes: Partial<Record<Route, string>> = {
  profile: auth0Scopes.profile,
};

export function getRouteFromHash(hash: string): Route {
  const normalized = hash.replace(/^#/, '').trim();
  const path = normalized.startsWith('/') ? normalized : `/${normalized}`;

  if (path === '/cart') return 'cart';
  if (path === '/profile') return 'profile';
  if (path === '/success') return 'success';
  return 'home';
}

export function navigateTo(route: Route, options: NavigateOptions = {}) {
  const hash = route === 'home' ? '#/' : `#/${route}`;
  const scope = protectedRouteScopes[route];

  if (options.loginWithRedirect && scope) {
    options.loginWithRedirect({
      authorizationParams: {
        scope,
        redirect_uri: `${window.location.origin}${hash}`,
      },
    });
    return false;
  }

  if (window.location.hash !== hash) window.location.hash = hash;
  return true;
}
