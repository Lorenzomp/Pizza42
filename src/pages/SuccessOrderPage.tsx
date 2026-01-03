import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { clearCart, getCartTotalCents, readCart } from '../cart/storage';
import { navigateTo } from '../router';
import { apiBasePath } from '../api/basePath';

const PENDING_ORDER_KEY = 'pizza42_pending_order_v1';

export default function SuccessOrderPage() {
  const {
    isAuthenticated,
    isLoading,
    getAccessTokenSilently,
  } = useAuth0();
  const [cleared, setCleared] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    const saveOrder = async () => {
      if (isLoading || !isAuthenticated || orderSaved) return;

      setOrderError('');
      let pendingOrder = null;
      const raw = sessionStorage.getItem(PENDING_ORDER_KEY);
      if (raw) {
        try {
          pendingOrder = JSON.parse(raw);
        } catch {
          pendingOrder = null;
        }
      }

      const items = Array.isArray(pendingOrder?.items)
        ? pendingOrder.items
        : readCart();
      const totalCents =
        typeof pendingOrder?.totalCents === 'number'
          ? pendingOrder.totalCents
          : getCartTotalCents(items);

      if (!apiBasePath) {
        setOrderError("Impossible de déterminer l'API.");
        return;
      }

      try {
        const token = await getAccessTokenSilently();
        const response = await fetch(`${apiBasePath}/me/orders`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items, totalCents }),
        });

        if (!response.ok) {
          throw new Error('Erreur API');
        }

        sessionStorage.removeItem(PENDING_ORDER_KEY);
        setOrderSaved(true);
        clearCart();
        setCleared(true);
      } catch {
        setOrderError('Impossible de sauvegarder la commande.');
      }
    };

    if (!cleared) saveOrder();
  }, [isAuthenticated, isLoading, cleared, orderSaved, getAccessTokenSilently]);

  return (
    <div className="page">
      <section className="section">
        <article className="card success-card">
          <div className="success-header">
            <div className="success-icon" aria-hidden />
            <div>
              <h1 className="section-title success-title">Commande confirmée</h1>
              <p className="section-subtitle success-subtitle">
                Merci pour votre commande. Vous allez recevoir un email de confirmation sous peu.
              </p>
              {orderError ? (
                <p className="section-subtitle success-subtitle">{orderError}</p>
              ) : null}
            </div>
          </div>

          <div className="success-actions">
            <button
              type="button"
              className="button primary"
              onClick={() => navigateTo('profile')}
            >
              Accéder aux commandes
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
