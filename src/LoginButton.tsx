import { useAuth0 } from '@auth0/auth0-react';
import { auth0Scopes } from './auth/scopes';

type LoginButtonProps = {
  className?: string;
  label?: string;
  disabled?: boolean;
};

export default function LoginButton({
  className,
  label = 'Connexion',
  disabled = false,
}: LoginButtonProps) {
  const { loginWithRedirect } = useAuth0();

  const classes = ['button', 'login', className].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={() => loginWithRedirect({
        authorizationParams: {
          scope: auth0Scopes.login,
        },
        appState: { returnTo: '#/' },
      })}
      className={classes}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
