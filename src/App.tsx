import { useAuth0 } from '@auth0/auth0-react';
import Profile from './Profile';
import Navbar from './Navbar';

function App() {
  const { isAuthenticated, isLoading, error } = useAuth0();

  const content = (() => {
    if (isLoading) {
      return (
        <div className="app-container">
          <div className="loading-state">
            <div className="loading-text">Chargement...</div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="app-container">
          <div className="error-state">
            <div className="error-title">Oups !</div>
            <div className="error-message">Une erreur est survenue</div>
            <div className="error-sub-message">{error.message}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="app-container">
        <div className="main-card-wrapper">
          <img
            src="/logo.png"
            alt="Pizza42 Logo"
            className="auth0-logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="main-title">Bienvenue chez Pizza42</h1>

          {isAuthenticated ? (
            <div className="logged-in-section">
              <div className="logged-in-message">
                Connecté. Bon appétit !
              </div>
              <h2 className="profile-section-title">Mon compte</h2>
              <div className="profile-card">
                <Profile />
              </div>
            </div>
          ) : (
            <div className="action-card">
              <p className="action-text">
                Connectez-vous pour commander vos pizzas.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  })();

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">{content}</main>
    </div>
  );
}

export default App;
