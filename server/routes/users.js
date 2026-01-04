import { Router } from 'express';
import fetch from 'node-fetch';
import { auth0Domain } from '../config.js';
import { getUser, patchUser } from '../management.js';

const router = Router();

const resolveIssuerBaseURL = (domain) => {
  if (!domain) return '';
  return domain.startsWith('http') ? domain : `https://${domain}`;
};

const findNamespacedOrders = (claimsObj) => {
  if (!claimsObj || typeof claimsObj !== 'object') return null;
  const key = Object.keys(claimsObj).find((candidate) =>
    candidate.endsWith('/orders'),
  );
  return key ? claimsObj[key] : null;
};

const extractBearerToken = (req) => {
  if (req.auth?.token) return req.auth.token;
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

const fetchOrdersFromAuth0 = async (accessToken) => {
  const issuerBaseURL = resolveIssuerBaseURL(auth0Domain);
  if (!issuerBaseURL) {
    throw new Error('missing_auth0_domain');
  }
  const response = await fetch(`${issuerBaseURL}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new Error('userinfo_failed');
  }
  const userInfo = await response.json();
  if (Array.isArray(userInfo?.orders)) return userInfo.orders;
  if (Array.isArray(userInfo?.app_metadata?.orders)) {
    return userInfo.app_metadata.orders;
  }
  const namespacedOrders = findNamespacedOrders(userInfo);
  if (Array.isArray(namespacedOrders)) return namespacedOrders;
  return null;
};

router.get('/me', (req, res) => {
  const payload = req.auth?.payload || {};
  res.json({
    user_id: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
  });
});

router.patch('/me/metadata', async (req, res) => {
  const payload = req.auth?.payload;
  if (!payload?.sub) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  const { address, phone } = req.body || {};
  const updates = {};

  if (typeof address === 'string' && address.trim().length > 0) {
    updates.address = address.trim();
  }

  if (
    phone &&
    typeof phone === 'object' &&
    typeof phone.number === 'string' &&
    phone.number.trim().length > 0
  ) {
    updates.phone = { number: phone.number.trim() };
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'no_valid_fields' });
  }

  try {
    const response = await patchUser(payload.sub, {
      user_metadata: updates,
    });
    if (response) return res.json(response);
    return res.status(204).send();
  } catch (error) {
    return res.status(502).json({ error: 'management_api_failed' });
  }
});

router.post('/me/orders', async (req, res) => {
  const payload = req.auth?.payload;
  if (!payload?.sub) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  const { items, totalCents } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'invalid_items' });
  }

  const normalizedItems = items
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: item.id,
      name: item.name,
      priceCents: item.priceCents,
      quantity: item.quantity,
    }))
    .filter(
      (item) =>
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.priceCents === 'number' &&
        typeof item.quantity === 'number',
    );

  if (normalizedItems.length === 0) {
    return res.status(400).json({ error: 'invalid_items' });
  }

  const order = {
    id: `order_${Date.now()}`,
    createdAt: new Date().toISOString(),
    totalCents: typeof totalCents === 'number' ? totalCents : null,
    items: normalizedItems,
  };

  try {
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return res.status(401).json({ error: 'missing_access_token' });
    }
    const ordersFromClaims = await fetchOrdersFromAuth0(accessToken);
    const existingOrders =
      ordersFromClaims ??
      (await (async () => {
        const user = await getUser(payload.sub);
        return Array.isArray(user?.app_metadata?.orders)
          ? user.app_metadata.orders
          : [];
      })());
    const nextOrders = [...existingOrders, order];

    await patchUser(payload.sub, {
      app_metadata: { orders: nextOrders },
    });

    return res.status(204).send();
  } catch {
    return res.status(502).json({ error: 'management_api_failed' });
  }
});

export default router;
