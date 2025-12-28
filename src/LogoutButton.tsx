import { useAuth0 } from '@auth0/auth0-react';

type LogoutButtonProps = {
  className?: string;
  label?: string;
  disabled?: boolean;
};

export default function LogoutButton({
  className,
  label = 'Déconnexion',
  disabled = false,
}: LogoutButtonProps) {
  const { logout } = useAuth0();

  const classes = ['button', 'logout', className].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      onClick={() =>
        logout({ logoutParams: { returnTo: window.location.origin } })
      }
      className={classes}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
