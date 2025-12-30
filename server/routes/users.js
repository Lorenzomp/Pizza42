import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { getUser, patchUser } from '../management.js';

const router = Router();

router.get('/me', requireAuth, (req, res) => {
  const payload = req.auth?.payload || {};
  res.json({
    user_id: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
  });
});

router.patch('/me/metadata', requireAuth, async (req, res) => {
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

router.post('/me/orders', requireAuth, async (req, res) => {
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
    const user = await getUser(payload.sub);
    const existingOrders = Array.isArray(user.app_metadata?.orders)
      ? user.app_metadata.orders
      : [];
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
