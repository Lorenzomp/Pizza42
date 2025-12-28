import { useAuth0 } from '@auth0/auth0-react';
import Profile from '../Profile';

export default function ProfilePage() {
  const { isAuthenticated } = useAuth0();

  return (
    <div className="page">
      <section className="section">
        <div className="section-head">
          <h1 className="section-title">Mon compte</h1>
          <p className="section-subtitle">
            Informations de profil liées à votre connexion.
          </p>
        </div>

        {isAuthenticated ? (
          <div className="card">
            <Profile />
          </div>
        ) : (
          <div className="card">
            <p className="muted">
              Connectez-vous pour consulter votre profil.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

