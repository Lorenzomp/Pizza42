import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const Profile = () => {
  const { user, isAuthenticated, isLoading, getIdTokenClaims } = useAuth0();
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const baseName = user?.name || '';
  const baseEmail = user?.email || '';

  useEffect(() => {
    let active = true;
    const loadClaims = async () => {
      if (!isAuthenticated) {
        setForm({ name: '', email: '', phone: '', address: '' });
        return;
      }
      setLoadingClaims(true);
      try {
        const claims = await getIdTokenClaims();

        const extractPhone = (): string => {
          const phoneFromClaimsObj = claims?.phone as Record<string, unknown> | undefined;
          const phoneFromUserObj = (user as Record<string, unknown> | undefined)?.phone as
            | Record<string, unknown>
            | undefined;

          const candidatesString: unknown[] = [
            claims?.phone_number,
            phoneFromClaimsObj?.internationalNumber,
            phoneFromClaimsObj?.nationalNumber,
            phoneFromClaimsObj?.number,
            (user as Record<string, unknown> | undefined)?.phone_number,
            phoneFromUserObj?.internationalNumber,
            phoneFromUserObj?.nationalNumber,
            phoneFromUserObj?.number,
          ];

          const foundString = candidatesString.find(
            (v) => typeof v === 'string' && v.trim().length > 0,
          ) as string | undefined;
          return foundString || '';
        };

        const extractAddress = (): string => {
          const addressRaw = claims?.address as unknown;
          const addressUser = (user as Record<string, unknown> | undefined)?.address as unknown;

          const candidateObjects = [addressRaw, addressUser].filter(
            (val) => val && typeof val === 'object',
          ) as Record<string, unknown>[];

          const candidateStrings = [addressRaw, addressUser].filter(
            (val) => typeof val === 'string' && (val as string).trim().length > 0,
          ) as string[];

          if (candidateStrings.length > 0) return candidateStrings[0];

          const fromObject = candidateObjects.find((obj) => {
            const formatted = obj?.formatted;
            return typeof formatted === 'string' && formatted.trim().length > 0;
          });
          if (fromObject) return (fromObject.formatted as string).trim();

          const structured = candidateObjects.find((obj) => {
            return (
              typeof obj.street_address === 'string' ||
              typeof obj.locality === 'string' ||
              typeof obj.region === 'string' ||
              typeof obj.postal_code === 'string' ||
              typeof obj.country === 'string'
            );
          });

          if (structured) {
            const parts = [
              structured.street_address,
              structured.locality,
              structured.region,
              structured.postal_code,
              structured.country,
            ]
              .filter((v) => typeof v === 'string' && v.trim().length > 0)
              .map((v) => (v as string).trim());
            if (parts.length) return parts.join(', ');
          }

          return '';
        };

        const phone = extractPhone();
        const address = extractAddress();

        if (!active) return;
        setForm({
          name: baseName,
          email: baseEmail,
          phone: phone || '',
          address: address || '',
        });
      } catch {
        if (!active) return;
        setForm({
          name: baseName,
          email: baseEmail,
          phone: '',
          address: '',
        });
      } finally {
        if (active) setLoadingClaims(false);
      }
    };
    loadClaims();
    return () => {
      active = false;
    };
  }, [isAuthenticated, getIdTokenClaims, baseName, baseEmail, user]);

  if (isLoading) {
    return <div className="loading-text">Chargement du profil...</div>;
  }

  return (
    isAuthenticated && user ? (
      <div className="profile-panel">
        <div className="profile-header">
          <img
            src={
              user.picture ||
              `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='110' viewBox='0 0 110 110'%3E%3Ccircle cx='55' cy='55' r='55' fill='%2363b3ed'/%3E%3Cpath d='M55 50c8.28 0 15-6.72 15-15s-6.72-15-15-15-15 6.72-15 15 6.72 15 15 15zm0 7.5c-10 0-30 5.02-30 15v3.75c0 2.07 1.68 3.75 3.75 3.75h52.5c2.07 0 3.75-1.68 3.75-3.75V72.5c0-9.98-20-15-30-15z' fill='%23fff'/%3E%3C/svg%3E`
            }
            alt={user.name || 'Utilisateur'}
            className="profile-picture"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='110' height='110' viewBox='0 0 110 110'%3E%3Ccircle cx='55' cy='55' r='55' fill='%2363b3ed'/%3E%3Cpath d='M55 50c8.28 0 15-6.72 15-15s-6.72-15-15-15-15 6.72-15 15 6.72 15 15 15zm0 7.5c-10 0-30 5.02-30 15v3.75c0 2.07 1.68 3.75 3.75 3.75h52.5c2.07 0 3.75-1.68 3.75-3.75V72.5c0-9.98-20-15-30-15z' fill='%23fff'/%3E%3C/svg%3E`;
            }}
          />
          <div>
            <div className="profile-name">{form.name || 'Utilisateur'}</div>
            <div className="profile-email">{form.email || 'Non renseigné'}</div>
          </div>
        </div>

        <div className="profile-form">
          <div className="field">
            <label htmlFor="name">Nom complet</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nom et prénom"
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@domaine.com"
            />
          </div>

          <div className="field">
            <label htmlFor="phone">Téléphone</label>
            <input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Votre numéro"
            />
            <p className="hint">
              Récupéré depuis les claims du token Auth0 (scope phone). Peut être vide si non fourni.
            </p>
          </div>

          <div className="field">
            <label htmlFor="address">Adresse</label>
            <textarea
              id="address"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder="Adresse postale"
              rows={3}
            />
            <p className="hint">
              Issue des claims d'adresse (scope address). Modifiable localement.
            </p>
          </div>

          <div className="field">
            <button type="button" className="button secondary" disabled>
              Mise à jour (bientôt disponible)
            </button>
            {loadingClaims ? (
              <p className="hint">Mise à jour depuis vos tokens...</p>
            ) : null}
          </div>
        </div>
      </div>
    ) : null
  );
};

export default Profile;
