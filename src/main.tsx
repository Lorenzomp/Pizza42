import './debug/console';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { Auth0Provider, type AppState } from '@auth0/auth0-react';

function onRedirectCallback(appState?: AppState) {
  const returnTo = appState?.returnTo;
  if (typeof returnTo !== 'string' || returnTo.length === 0) return;

  if (returnTo.startsWith('#')) {
    window.location.hash = returnTo;
    return;
  }

  window.location.hash = returnTo.startsWith('/') ? `#${returnTo}` : `#/${returnTo}`;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={import.meta.env.AUTH0_DOMAIN}
      clientId={import.meta.env.AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.AUTH0_AUDIENCE,
      }}
      onRedirectCallback={onRedirectCallback}
    >
      <App />
    </Auth0Provider>
  </StrictMode>
);
