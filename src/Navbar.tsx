import { useAuth0 } from '@auth0/auth0-react';
import LoginButton from './LoginButton';
import LogoutButton from './LogoutButton';

export default function Navbar() {
  const { isAuthenticated, isLoading } = useAuth0();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="navbar-left">
          <img src="/logo.png" alt="Pizza42" className="navbar-logo" />
        </div>

        <div className="navbar-right">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                className="button icon profile"
                aria-label="Mon profil"
                disabled={isLoading}
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

          <button type="button" className="button icon cart" aria-label="Panier">
            <img src="/cart.svg" alt="" className="nav-icon" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}
