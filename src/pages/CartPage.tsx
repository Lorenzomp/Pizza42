import { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  clearCart,
  getCartTotalCents,
  onCartChanged,
  readCart,
  setItemQuantity,
  type CartItem,
} from '../cart/storage';
import { formatPriceEUR } from '../format';

const PENDING_ORDER_KEY = 'pizza42_pending_order_v1';

export default function CartPage() {
  const { loginWithRedirect, isLoading: isAuthLoading } = useAuth0();
  const [items, setItems] = useState<CartItem[]>(() => readCart());

  useEffect(() => onCartChanged(() => setItems(readCart())), []);

  const totalCents = useMemo(() => getCartTotalCents(items), [items]);

  const handleCheckout = () => {
    const pendingOrder = {
      items,
      totalCents,
    };
    sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(pendingOrder));

    loginWithRedirect({
      authorizationParams: {
        scope: 'openid profile email address phone email_verified update:my_profile',
        redirect_uri: `${window.location.origin}#/success`,
      },
    });
  };

  return (
    <div className="page">
      <section className="section">
        <div className="section-head section-head-row">
          <div>
            <h1 className="section-title">Panier</h1>
            <p className="section-subtitle">Vos pizzas, prêtes à être commandées.</p>
          </div>

          <button
            type="button"
            className="button secondary"
            onClick={() => clearCart()}
            disabled={items.length === 0}
          >
            Vider
          </button>
        </div>

        {items.length === 0 ? (
          <div className="card">
            <p className="muted">Votre panier est vide.</p>
          </div>
        ) : (
          <div className="cart">
            <div className="cart-list">
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  <img
                    src={item.image}
                    alt=""
                    className="cart-item-image"
                    aria-hidden
                  />
                  <div className="cart-item-main">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">
                      {formatPriceEUR(item.priceCents)}
                    </div>
                  </div>

                  <div className="cart-item-controls">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => setItemQuantity(item.id, item.quantity - 1)}
                      aria-label="Retirer une unité"
                    >
                      −
                    </button>
                    <div className="qty">{item.quantity}</div>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => setItemQuantity(item.id, item.quantity + 1)}
                      aria-label="Ajouter une unité"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary card">
              <div className="cart-total-row">
                <span>Total</span>
                <strong>{formatPriceEUR(totalCents)}</strong>
              </div>
              <button
                type="button"
                className="button primary"
                onClick={handleCheckout}
                disabled={items.length === 0 || isAuthLoading}
              >
                Commander
              </button>
              <p className="muted small">
                Nous aurons besoin de vos informations de contact pour confirmer la livraison.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
