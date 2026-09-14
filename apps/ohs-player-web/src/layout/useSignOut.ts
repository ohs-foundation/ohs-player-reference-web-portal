import { useAuth } from 'ohs-player-web-core';
import { useNavigate } from 'react-router-dom';

const LOGOUT_PATH = '/logout';

// signoutRedirect clears the local user before leaving, which would flash /login; park on /logout first.
export function useSignOut(): () => void {
  const auth = useAuth();
  const navigate = useNavigate();

  return (): void => {
    void navigate(LOGOUT_PATH, { state: { signingOut: true } });
    void auth.logout();
  };
}
