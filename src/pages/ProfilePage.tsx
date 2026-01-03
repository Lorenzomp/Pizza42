import Profile from '../Profile';
import { useAuth0, withAuthenticationRequired } from '@auth0/auth0-react';
import { auth0Scopes } from '../auth/scopes';
import { sanitizeScopeString } from '../auth/scopeUtils';
import { useEffect, useState } from 'react';

const REQUIRED_PROFILE_SCOPES = ['address', 'phone', 'email_verified'] as const;
const REQUIRED_PROFILE_CLAIMS = ['full_address', 'email_verified'] as const;
const PROFILE_SCOPE_UPGRADE_KEY = 'pizza42_profile_scope_upgrade_v1';
const AUTH_DEBUG_STORAGE_KEY = 'pizza42_auth_debug_v1';

function debugAuth(message: string, details?: unknown) {
  const enabled =
    import.meta.env.DEV ||
    String(import.meta.env.VITE_AUTH_DEBUG).toLowerCase() === 'true' ||
    sessionStorage.getItem(AUTH_DEBUG_STORAGE_KEY) === 'true';
  if (!enabled) return;
  if (details === undefined) console.log(`[auth][profile] ${message}`);
  else console.log(`[auth][profile] ${message}`, details);
}

function parseScopes(scope?: string) {
  return new Set(
    (scope ?? '')
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function removeTokenFromScopes(scopes: string, tokenToRemove: string) {
  const values = scopes
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => value !== tokenToRemove);
  return Array.from(new Set(values)).join(' ');
}

function decodeJwtPayload(token?: string) {
  if (!token) return undefined;
  const parts = token.split('.');
  if (parts.length < 2) return undefined;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      '=',
    );
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function extractScopesFromAccessToken(accessToken?: string) {
  const payload = decodeJwtPayload(accessToken);
  const value = payload?.scope ?? payload?.scp;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string').join(' ');
  }
  return undefined;
}

const PROFILE_REQUIRED_SCOPES = (() => {
  // This is what we request from Auth0; it includes `email_verified` as a trigger scope.
  const base = auth0Scopes.profile.trim();
  const all = base ? [base, ...REQUIRED_PROFILE_SCOPES] : [...REQUIRED_PROFILE_SCOPES];
  return Array.from(new Set(all.join(' ').split(/\s+/).filter(Boolean))).join(' ');
})();

function ProfilePage() {
  const {
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
    getIdTokenClaims,
    loginWithRedirect,
  } = useAuth0();
  const [hasRequiredScopes, setHasRequiredScopes] = useState(false);
  const [scopeError, setScopeError] = useState('');
  const requiredScopes = PROFILE_REQUIRED_SCOPES;
  const enforcedTokenScopes = removeTokenFromScopes(
    sanitizeScopeString(requiredScopes),
    'email_verified',
  );

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    let cancelled = false;

    const ensureScopes = async () => {
      setScopeError('');
      setHasRequiredScopes(false);

      debugAuth('Starting gate check', {
        requiredScopes,
        enforcedTokenScopes,
        requiredClaims: REQUIRED_PROFILE_CLAIMS,
        hash: window.location.hash,
        alreadyTried: sessionStorage.getItem(PROFILE_SCOPE_UPGRADE_KEY),
      });

      try {
        const response = await getAccessTokenSilently({
          detailedResponse: true,
          authorizationParams: { scope: requiredScopes },
        });

        debugAuth('Silent token response', {
          responseScope: response.scope,
          tokenType: response.token_type,
          expiresIn: response.expires_in,
        });

        const tokenScopes = extractScopesFromAccessToken(response.access_token);
        debugAuth(
          tokenScopes
            ? 'Decoded access token scopes'
            : 'Could not decode access token scopes (no scope/scp claim)',
          tokenScopes ? { tokenScopes } : undefined,
        );

        const granted = parseScopes(response.scope ?? tokenScopes);
        const required = parseScopes(enforcedTokenScopes);
        const missing = Array.from(required).filter((value) => !granted.has(value));

        debugAuth('Scope comparison', {
          granted: Array.from(granted),
          missing,
          enforcedTokenScopes,
        });
        if (missing.length > 0) {
          console.warn('[auth][profile] Missing required scopes', {
            requiredScopes: enforcedTokenScopes,
            tokenEndpointScope: response.scope,
            decodedAccessTokenScope: tokenScopes,
            missing,
          });
        }

        if (missing.length === 0) {
          const claims = await getIdTokenClaims();
          const claimSource = (claims ?? {}) as Record<string, unknown>;
          const userSource = (user ?? {}) as Record<string, unknown>;

          debugAuth('ID token claims keys', Object.keys(claimSource));
          debugAuth('User keys', Object.keys(userSource));

          const missingClaims = REQUIRED_PROFILE_CLAIMS.filter((key) => {
            const value = claimSource[key] ?? userSource[key];
            return value === undefined || value === null || value === '';
          });
          if (missingClaims.includes('email_verified')) {
            console.warn(
              '[auth][profile] `email_verified` claim missing/falsey (scope trigger requested but claim not present)',
            );
          }

          if (missingClaims.length > 0) {
            const possible = [...Object.keys(claimSource), ...Object.keys(userSource)].filter(
              (key) =>
                key.toLowerCase().includes('address') ||
                key.toLowerCase().includes('full'),
            );
            debugAuth('Missing required claims', {
              missingClaims,
              possibleClaimKeys: possible,
            });
            console.warn('[auth][profile] Missing required claims', {
              missingClaims,
              possibleClaimKeys: possible,
            });
          } else {
            debugAuth('Required claims present');
          }

          if (missingClaims.length === 0) {
            sessionStorage.removeItem(PROFILE_SCOPE_UPGRADE_KEY);
            if (!cancelled) setHasRequiredScopes(true);
            return;
          }
        }
      } catch (err) {
        console.warn('[auth][profile] Silent token failed', err);
        // If we cannot silently obtain a token for the required scopes, we'll redirect.
      }

      const alreadyTried = sessionStorage.getItem(PROFILE_SCOPE_UPGRADE_KEY);
      debugAuth('Upgrade check', { alreadyTried });
      if (alreadyTried === requiredScopes) {
        if (!cancelled) {
          setScopeError(
            `Connexion requise avec les permissions suivantes : ${requiredScopes} (et la claim ${REQUIRED_PROFILE_CLAIMS.join(', ')})`,
          );
        }
        console.warn('[auth][profile] Stopping to avoid redirect loop; clear sessionStorage to retry', {
          key: PROFILE_SCOPE_UPGRADE_KEY,
          value: alreadyTried,
        });
        return;
      }

      sessionStorage.setItem(PROFILE_SCOPE_UPGRADE_KEY, requiredScopes);
      debugAuth('Redirecting to upgrade scopes/claims', { requiredScopes });
      await loginWithRedirect({
        authorizationParams: { scope: requiredScopes },
        appState: { returnTo: window.location.hash || '#/profile' },
      });
    };

    ensureScopes();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    isLoading,
    user,
    getAccessTokenSilently,
    getIdTokenClaims,
    loginWithRedirect,
    requiredScopes,
    enforcedTokenScopes,
  ]);

  if (!hasRequiredScopes) {
    return (
      <div className="page">
        <section className="section">
          <div className="card">
            {scopeError ? (
              <p className="muted">{scopeError}</p>
            ) : (
              <p className="muted">Chargement...</p>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="section">
        <div className="section-head">
          <h1 className="section-title">Mon compte</h1>
          <p className="section-subtitle">
            Informations de profil liées à votre connexion.
          </p>
        </div>
        <div className="card">
          <Profile />
        </div>
      </section>
    </div>
  );
}

function ProfileRedirecting() {
  console.log(
    '[auth][profile] onRedirecting: user not authenticated yet; redirecting to login',
  );
  debugAuth('onRedirecting details', {
    hash: window.location.hash,
    requiredScopes: PROFILE_REQUIRED_SCOPES,
  });
  return (
    <div className="app-container center">
      <div className="loading-state">
        <div className="loading-text">Redirection...</div>
      </div>
    </div>
  );
}

const GuardedProfilePage = withAuthenticationRequired(ProfilePage, {
  returnTo: () => window.location.hash || '#/',
  loginOptions: {
    authorizationParams: {
      scope: PROFILE_REQUIRED_SCOPES,
    },
  },
  onRedirecting: ProfileRedirecting,
});

export default GuardedProfilePage;
