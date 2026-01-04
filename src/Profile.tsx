import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiBasePath } from './api/basePath';
import { auth0Scopes } from './auth/scopes';

type OrderSummary = {
  id: string;
  createdAt: string | null;
  createdAtTs: number | null;
  totalCents: number | null;
  itemsCount: number | null;
  itemNames: string[];
};

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const parseTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  const ts = date.valueOf();
  return Number.isNaN(ts) ? null : ts;
};

const findNamespacedOrders = (claimsObj: Record<string, unknown>) => {
  const key = Object.keys(claimsObj).find((candidate) =>
    candidate.endsWith('/orders'),
  );
  return key ? claimsObj[key] : null;
};

const extractOrdersFromClaims = (claims: unknown): OrderSummary[] => {
  const claimsObj = claims as Record<string, unknown> | null;
  if (!claimsObj) return [];

  const directOrders = claimsObj.orders;
  const appMetadataOrders =
    (claimsObj.app_metadata as Record<string, unknown> | undefined)?.orders;
  const namespacedOrders = findNamespacedOrders(claimsObj);
  const rawOrders = Array.isArray(directOrders)
    ? directOrders
    : Array.isArray(appMetadataOrders)
      ? appMetadataOrders
      : Array.isArray(namespacedOrders)
        ? namespacedOrders
        : [];

  return rawOrders
    .map((raw, index) => {
      if (!raw || typeof raw !== 'object') return null;
      const order = raw as Record<string, unknown>;
      const id =
        typeof order.id === 'string' && order.id.trim().length > 0
          ? order.id
          : `Commande ${index + 1}`;
      const createdAt =
        typeof order.createdAt === 'string' ? order.createdAt : null;
      const createdAtTs = parseTimestamp(createdAt);
      const totalCents =
        typeof order.totalCents === 'number' && Number.isFinite(order.totalCents)
          ? order.totalCents
          : null;
      const items = Array.isArray(order.items) ? order.items : [];
      let itemsCount = 0;
      let hasQuantity = false;
      const itemNames = items
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const name = (item as Record<string, unknown>).name;
          return typeof name === 'string' && name.trim().length > 0
            ? name.trim()
            : null;
        })
        .filter((name): name is string => Boolean(name));

      items.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        const qty = (item as Record<string, unknown>).quantity;
        if (typeof qty === 'number' && Number.isFinite(qty)) {
          itemsCount += qty;
          hasQuantity = true;
        }
      });

      const safeItemsCount = hasQuantity ? itemsCount : items.length || null;

      return {
        id,
        createdAt,
        createdAtTs,
        totalCents,
        itemsCount: safeItemsCount,
        itemNames,
      };
    })
    .filter((order): order is OrderSummary => Boolean(order))
    .sort((a, b) => (b.createdAtTs ?? 0) - (a.createdAtTs ?? 0))
    .slice(0, 3);
};

const formatOrderDate = (value: string | null) => {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'Date inconnue';
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatItemsCount = (value: number | null) => {
  if (value === null) return 'Articles inconnus';
  return value === 1 ? '1 article' : `${value} articles`;
};

const formatTotal = (value: number | null) => {
  if (value === null) return 'Total inconnu';
  return currencyFormatter.format(value / 100);
};

const resolveIssuerBaseURL = (domain?: string) => {
  if (!domain) return '';
  return domain.startsWith('http') ? domain : `https://${domain}`;
};

const decodeJwtPayload = (token?: string) => {
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
};

const Profile = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    getIdTokenClaims,
    getAccessTokenSilently,
  } = useAuth0();
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [refreshOrdersError, setRefreshOrdersError] = useState('');
  const didAutoRefreshOrders = useRef(false);

  const baseName = user?.name || '';
  const baseEmail = user?.email || '';

  useEffect(() => {
    let active = true;
    const loadClaims = async () => {
      if (!isAuthenticated) {
        setForm({ name: '', email: '', phone: '', address: '' });
        setRecentOrders([]);
        return;
      }
      setLoadingClaims(true);
      try {
        const claims = await getIdTokenClaims();

        const extractPhone = (): string => {
          const phoneFromClaimsObj = claims?.phone as Record<string, unknown> | undefined;
          const phoneFromUserObj = (user as Record<string, unknown> | undefined)?.phone as
            | Record<string, unknown>
            | undefined;

          const candidatesString: unknown[] = [
            claims?.phone,
            (user as Record<string, unknown> | undefined)?.phone,
            claims?.phone_number,
            phoneFromClaimsObj?.internationalNumber,
            phoneFromClaimsObj?.nationalNumber,
            phoneFromClaimsObj?.number,
            (user as Record<string, unknown> | undefined)?.phone_number,
            phoneFromUserObj?.internationalNumber,
            phoneFromUserObj?.nationalNumber,
            phoneFromUserObj?.number,
          ];

          const foundString = candidatesString.find(
            (v) => typeof v === 'string' && v.trim().length > 0,
          ) as string | undefined;
          return foundString || '';
        };

        const extractAddress = (): string => {
          const addressRaw =
            (claims as Record<string, unknown> | undefined)?.full_address ??
            claims?.address;
          const addressUser =
            (user as Record<string, unknown> | undefined)?.full_address ??
            (user as Record<string, unknown> | undefined)?.address;

          const candidateObjects = [addressRaw, addressUser].filter(
            (val) => val && typeof val === 'object',
          ) as Record<string, unknown>[];

          const candidateStrings = [addressRaw, addressUser].filter(
            (val) => typeof val === 'string' && (val as string).trim().length > 0,
          ) as string[];

          if (candidateStrings.length > 0) return candidateStrings[0];

          const fromObject = candidateObjects.find((obj) => {
            const formatted = obj?.formatted;
            return typeof formatted === 'string' && formatted.trim().length > 0;
          });
          if (fromObject) return (fromObject.formatted as string).trim();

          const structured = candidateObjects.find((obj) => {
            return (
              typeof obj.street_address === 'string' ||
              typeof obj.locality === 'string' ||
              typeof obj.region === 'string' ||
              typeof obj.postal_code === 'string' ||
              typeof obj.country === 'string'
            );
          });

          if (structured) {
            const parts = [
              structured.street_address,
              structured.locality,
              structured.region,
              structured.postal_code,
              structured.country,
            ]
              .filter((v) => typeof v === 'string' && v.trim().length > 0)
              .map((v) => (v as string).trim());
            if (parts.length) return parts.join(', ');
          }

          return '';
        };

        const phone = extractPhone();
        const address = extractAddress();
        const orders = extractOrdersFromClaims(claims);

        if (!active) return;
        setForm({
          name: baseName,
          email: baseEmail,
          phone: phone || '',
          address: address || '',
        });
        setRecentOrders(orders);
      } catch {
        if (!active) return;
        setForm({
          name: baseName,
          email: baseEmail,
          phone: '',
          address: '',
        });
        setRecentOrders([]);
      } finally {
        if (active) setLoadingClaims(false);
      }
    };
    loadClaims();
    return () => {
      active = false;
    };
  }, [isAuthenticated, getIdTokenClaims, baseName, baseEmail, user]);

  const refreshOrdersFromUserInfo = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshOrdersError('');
    setRefreshingOrders(true);
    try {
      const tokenResponse = await getAccessTokenSilently({
        detailedResponse: true,
        cacheMode: 'off',
        authorizationParams: {
          scope: auth0Scopes.profile,
        },
      });

      const accessToken = tokenResponse.access_token;
      const decoded = decodeJwtPayload(accessToken);
      console.log('[profile] refresh orders token details', {
        tokenEndpointScope: tokenResponse.scope,
        accessTokenAud: decoded?.aud,
        accessTokenIss: decoded?.iss,
        accessTokenSub: decoded?.sub,
      });

      const issuerBaseURL = resolveIssuerBaseURL(import.meta.env.AUTH0_DOMAIN);
      if (!issuerBaseURL) {
        throw new Error('missing_auth0_domain');
      }

      const response = await fetch(`${issuerBaseURL}/userinfo`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let body = '';
        try {
          body = await response.text();
        } catch {
          body = '';
        }
        console.warn('[profile] /userinfo failed', {
          status: response.status,
          statusText: response.statusText,
          body,
        });
        throw new Error(`userinfo_failed:${response.status}`);
      }

      const userInfo = await response.json();
      console.log('[profile] /userinfo success', userInfo);
      const orders = extractOrdersFromClaims(userInfo);
      setRecentOrders(orders);
    } catch (err) {
      console.warn('[profile] unable to refresh orders from /userinfo', err);
      const message =
        err instanceof Error && err.message.startsWith('userinfo_failed:')
          ? `Impossible de rafraîchir les commandes (userinfo ${err.message.split(':')[1]}).`
          : 'Impossible de rafraîchir les commandes pour le moment.';
      setRefreshOrdersError(message);
    } finally {
      setRefreshingOrders(false);
    }
  }, [getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      didAutoRefreshOrders.current = false;
      return;
    }
    if (didAutoRefreshOrders.current) return;
    didAutoRefreshOrders.current = true;
    void refreshOrdersFromUserInfo();
  }, [isAuthenticated, isLoading, refreshOrdersFromUserInfo]);

  if (isLoading) {
    return <div className="loading-text">Chargement du profil...</div>;
  }

  const handleSave = async () => {
    if (!isAuthenticated) return;
    setSaveError('');
    setSaveSuccess(false);

    const updates: Record<string, unknown> = {};
    const trimmedAddress = form.address.trim();
    const trimmedPhone = form.phone.trim();

    if (trimmedAddress) updates.address = trimmedAddress;
    if (trimmedPhone) updates.phone = { number: trimmedPhone };

    if (!apiBasePath) {
      setSaveError("Impossible de déterminer l'API.");
      return;
    }

    if (Object.keys(updates).length === 0) {
      setSaveError('Aucune donnée à mettre à jour.');
      return;
    }

    setSaving(true);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.AUTH0_AUDIENCE,
        },
      });
      const response = await fetch(`${apiBasePath}/me/metadata`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Erreur API');
      }

      setSaveSuccess(true);
    } catch {
      setSaveError('Mise à jour impossible pour le moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    isAuthenticated && user ? (
      <div className="profile-panel">
        <div className="profile-header">
          <img
            src={
              user.picture ||
              `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='110' viewBox='0 0 110 110'%3E%3Ccircle cx='55' cy='55' r='55' fill='%2363b3ed'/%3E%3Cpath d='M55 50c8.28 0 15-6.72 15-15s-6.72-15-15-15-15 6.72-15 15 6.72 15 15 15zm0 7.5c-10 0-30 5.02-30 15v3.75c0 2.07 1.68 3.75 3.75 3.75h52.5c2.07 0 3.75-1.68 3.75-3.75V72.5c0-9.98-20-15-30-15z' fill='%23fff'/%3E%3C/svg%3E`
            }
            alt={user.name || 'Utilisateur'}
            className="profile-picture"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='110' viewBox='0 0 110 110'%3E%3Ccircle cx='55' cy='55' r='55' fill='%2363b3ed'/%3E%3Cpath d='M55 50c8.28 0 15-6.72 15-15s-6.72-15-15-15-15 6.72-15 15 6.72 15 15 15zm0 7.5c-10 0-30 5.02-30 15v3.75c0 2.07 1.68 3.75 3.75 3.75h52.5c2.07 0 3.75-1.68 3.75-3.75V72.5c0-9.98-20-15-30-15z' fill='%23fff'/%3E%3C/svg%3E`;
            }}
          />
          <div>
            <div className="profile-name">{form.name || 'Utilisateur'}</div>
            <div className="profile-email">{form.email || 'Non renseigné'}</div>
          </div>
        </div>

        <div className="profile-form">

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@domaine.com"
            />
          </div>

          <div className="field">
            <label htmlFor="phone">Téléphone</label>
            <input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Votre numéro"
            />
          </div>

          <div className="field">
            <label htmlFor="address">Adresse</label>
            <textarea
              id="address"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder="Adresse postale"
              rows={3}
            />
          </div>

          <div className="field">
            <button
              type="button"
              className="button secondary"
              disabled={saving || loadingClaims}
              onClick={handleSave}
            >
              {saving ? 'Mise à jour...' : 'Mettre à jour'}
            </button>
            {loadingClaims ? (
              <p className="hint">Mise à jour...</p>
            ) : null}
            {saveSuccess ? (
              <p className="hint">Profil mis à jour.</p>
            ) : null}
            {saveError ? (
              <p className="hint">{saveError}</p>
            ) : null}
          </div>
        </div>

        <div className="profile-orders">
          <div className="orders-header">
            <div>
              <h2 className="orders-title">Dernières commandes</h2>
              <p className="orders-subtitle">Extraites de votre jeton</p>
            </div>
            <button
              type="button"
              className="button secondary"
              onClick={refreshOrdersFromUserInfo}
              disabled={refreshingOrders || loadingClaims}
            >
              {refreshingOrders ? 'Rafraîchissement...' : 'Rafraîchir'}
            </button>
          </div>
          {refreshOrdersError ? <p className="hint">{refreshOrdersError}</p> : null}
          {loadingClaims ? (
            <p className="hint">Chargement des commandes...</p>
          ) : null}
          {!loadingClaims && recentOrders.length === 0 ? (
            <p className="hint">Aucune commande n'a été passée récemment.</p>
          ) : null}
          {!loadingClaims && recentOrders.length > 0 ? (
            <ul className="orders-list">
              {recentOrders.map((order) => (
                <li key={order.id} className="order-row">
                  <div className="order-meta">
                    <div className="order-id">{order.id}</div>
                    <div className="order-sub">
                      {formatOrderDate(order.createdAt)} ·{' '}
                      {formatItemsCount(order.itemsCount)}
                    </div>
                    {order.itemNames.length > 0 ? (
                      <div className="order-items">
                        {order.itemNames.join(', ')}
                      </div>
                    ) : null}
                  </div>
                  <div className="order-total">
                    {formatTotal(order.totalCents)}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    ) : null
  );
};

export default Profile;
