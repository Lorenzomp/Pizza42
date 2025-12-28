import { useAuth0 } from '@auth0/auth0-react';
import Navbar from './Navbar';
import { getCartCount, onCartChanged, readCart } from './cart/storage';
import CartPage from './pages/CartPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SuccessOrderPage from './pages/SuccessOrderPage';
import { getRouteFromHash, navigateTo, type Route } from './router';
import { useEffect, useMemo, useState } from 'react';

function App() {
  const { isLoading, error } = useAuth0();
  const [route, setRoute] = useState<Route>(() =>
    getRouteFromHash(window.location.hash),
  );
  const [cartItems, setCartItems] = useState(() => readCart());

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => onCartChanged(() => setCartItems(readCart())), []);

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
          navigateTo(next);
          setRoute(next);
        }}
      />
      <main className="app-main">{content}</main>
    </div>
  );
}

export default App;
