import { useAuth0 } from '@auth0/auth0-react';
import LoginButton from './LoginButton';
import LogoutButton from './LogoutButton';
import type { Route } from './router';

type NavbarProps = {
  route: Route;
  cartCount: number;
  onNavigate: (route: Route) => void;
};

export default function Navbar({ route, cartCount, onNavigate }: NavbarProps) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-left">
          <button
            type="button"
            className="brand"
            onClick={() => onNavigate('home')}
            aria-label="Aller à l'accueil"
          >
            <img src="/logo.png" alt="Pizza42" className="navbar-logo" />
          </button>
        </div>

        <div className="navbar-right">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="button icon profile"
                aria-label="Mon profil"
                disabled={isLoading}
                aria-current={route === 'profile' ? 'page' : undefined}
                onClick={() =>
                  loginWithRedirect({
                    authorizationParams: {
                      scope:
                        'openid profile email phone address email_verified orders update:user_app_metadata',
                      redirect_uri: `${window.location.origin}#/profile`,
                    },
                  })
                }
              >
                <img
                  src="/profile.svg"
                  alt=""
                  className="nav-icon"
                  aria-hidden
                />
              </button>

              <LogoutButton
                className="navbar-action"
                label="Déconnexion"
                disabled={isLoading}
              />
            </>
          ) : (
            <LoginButton
              className="navbar-action"
              label="Connexion"
              disabled={isLoading}
            />
          )}

          <button
            type="button"
            className="button icon cart"
            aria-label={`Panier (${cartCount})`}
            aria-current={route === 'cart' ? 'page' : undefined}
            onClick={() => onNavigate('cart')}
          >
            <img src="/cart.svg" alt="" className="nav-icon" aria-hidden />
            {cartCount > 0 ? <span className="badge">{cartCount}</span> : null}
          </button>
        </div>
      </div>
    </header>
  );
}
