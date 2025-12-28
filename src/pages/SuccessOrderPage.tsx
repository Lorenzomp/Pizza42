import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { clearCart } from '../cart/storage';
import { navigateTo } from '../router';

export default function SuccessOrderPage() {
  const { isAuthenticated, isLoading } = useAuth0();
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !cleared) {
      clearCart();
      setCleared(true);
    }
  }, [isAuthenticated, isLoading, cleared]);

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
            </div>
          </div>

          <div className="success-actions">
            <button
              type="button"
              className="button primary"
              onClick={() => navigateTo('home')}
            >
              Retour aux pizzas
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
