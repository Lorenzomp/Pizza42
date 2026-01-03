import { useAuth0 } from '@auth0/auth0-react';
import Navbar from './Navbar';
import { getCartCount, onCartChanged, readCart } from './cart/storage';
import CartPage from './pages/CartPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SuccessOrderPage from './pages/SuccessOrderPage';
import { getRouteFromHash, navigateTo, type Route } from './router';
import { useEffect, useMemo, useState } from 'react';
import { auth0Scopes } from './auth/scopes';

const INVALID_STATE_RECOVERY_KEY = 'pizza42_invalid_state_recovery_v1';

function isInvalidStateError(error: unknown) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message)
      : '';
  return /invalid state/i.test(message);
}

function stripAuthCallbackFromUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    const cleaned = `${url.origin}${url.pathname}${url.hash}`;
    window.history.replaceState({}, document.title, cleaned);
  } catch {
    // ignore
  }
}

function hasAuthCallbackParams() {
  try {
    const url = new URL(window.location.href);
    return (
      url.searchParams.has('code') ||
      url.searchParams.has('state') ||
      url.searchParams.has('error') ||
      url.searchParams.has('error_description')
    );
  } catch {
    return false;
  }
}

function App() {
  const {
    isLoading,
    error,
    isAuthenticated,
    getAccessTokenSilently,
    getIdTokenClaims,
    loginWithRedirect,
  } = useAuth0();
  const [route, setRoute] = useState<Route>(() =>
    getRouteFromHash(window.location.hash),
  );
  const [cartItems, setCartItems] = useState(() => readCart());
  const [tokensLoggedForUser, setTokensLoggedForUser] = useState(false);

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => onCartChanged(() => setCartItems(readCart())), []);

	  useEffect(() => {
	    const logTokens = async () => {
	      if (!isAuthenticated || tokensLoggedForUser) return;
	      try {
	        const accessToken = await getAccessTokenSilently({
	          authorizationParams: {
	            audience: import.meta.env.AUTH0_AUDIENCE,
	          },
	        });
	        const idToken = await getIdTokenClaims();
	        // Logging tokens for debugging purposes only.
	        console.log('Access Token:', accessToken);
	        console.log('ID Token:', idToken);
	        setTokensLoggedForUser(true);
	      } catch (err) {
	        console.warn('Unable to log tokens', err);
	      }
	    };
	    logTokens();
	  }, [isAuthenticated, getAccessTokenSilently, getIdTokenClaims, tokensLoggedForUser]);

  const cartCount = useMemo(() => getCartCount(cartItems), [cartItems]);

  const content = (() => {
    if (isLoading) {
      return (
        <div className="app-container center">
          <div className="loading-state">
            <div className="loading-text">Chargement...</div>
          </div>
        </div>
      );
    }

    if (error) {
      if (isInvalidStateError(error) && hasAuthCallbackParams()) {
        return (
          <InvalidStateRecovery
            route={route}
            loginWithRedirect={loginWithRedirect}
          />
        );
      }
      return (
        <div className="app-container center">
          <div className="error-state">
            <div className="error-title">Oups !</div>
            <div className="error-message">Une erreur est survenue</div>
            <div className="error-sub-message">{error.message}</div>
          </div>
        </div>
      );
    }

    if (route === 'cart') return <CartPage />;
    if (route === 'profile') return <ProfilePage />;
    if (route === 'success') return <SuccessOrderPage />;
    return <HomePage />;
  })();

  return (
    <div className="app-shell">
      <Navbar
        route={route}
        cartCount={cartCount}
        onNavigate={(next) => {
          const didNavigate = navigateTo(next);
          if (didNavigate) setRoute(next);
        }}
      />
      <main className="app-main">{content}</main>
    </div>
  );
}

export default App;

function InvalidStateRecovery({
  route,
  loginWithRedirect,
}: {
  route: Route;
  loginWithRedirect: (options?: {
    authorizationParams?: { scope?: string };
    appState?: { returnTo?: string };
  }) => void | Promise<void>;
}) {
  useEffect(() => {
    const key = `${INVALID_STATE_RECOVERY_KEY}:${window.location.pathname}:${window.location.hash}`;
    const alreadyRecovered = sessionStorage.getItem(key) === 'true';
    if (alreadyRecovered) return;
    sessionStorage.setItem(key, 'true');

    stripAuthCallbackFromUrl();
    sessionStorage.removeItem('pizza42_profile_scope_upgrade_v1');

    if (route === 'profile') {
      const base = auth0Scopes.profile.trim();
      const requiredScopes = base ? `${base} address phone email_verified` : 'address phone email_verified';
      void loginWithRedirect({
        authorizationParams: { scope: requiredScopes },
        appState: { returnTo: '#/profile' },
      });
      return;
    }

    window.location.reload();
  }, [route, loginWithRedirect]);

  return (
    <div className="app-container center">
      <div className="loading-state">
        <div className="loading-text">Récupération de session...</div>
      </div>
    </div>
  );
}
