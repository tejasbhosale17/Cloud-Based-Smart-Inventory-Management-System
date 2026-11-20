import { useCallback, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { fetchProducts, UnauthorizedRequestError } from './api/products';
import type { FrontendConfiguration } from './auth/auth-config';
import { createCognitoLogoutUrl } from './auth/cognito-logout';
import LoginPage from './auth/LoginPage';
import ProtectedRoute from './auth/ProtectedRoute';
import InventoryDashboard from './InventoryDashboard';

interface AppProps {
  configuration: FrontendConfiguration;
}

function App({ configuration }: AppProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const accessToken = auth.user?.access_token ?? '';
  const removeUser = auth.removeUser;

  const loadProducts = useCallback(() => {
    if (!accessToken) {
      return Promise.reject(new UnauthorizedRequestError());
    }
    return fetchProducts(configuration.apiBaseUrl, accessToken);
  }, [accessToken, configuration.apiBaseUrl]);

  const handleUnauthorized = useCallback(async () => {
    setSessionExpired(true);
    try {
      await removeUser();
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Unable to clear an unauthorized session.',
          errorName: error instanceof Error ? error.name : 'UnknownError',
        }),
      );
    }

    navigate('/login?reason=session-expired', { replace: true });
  }, [navigate, removeUser]);

  const handleSignOut = useCallback(async () => {
    setSignOutError('');

    try {
      await removeUser();
      window.location.assign(
        createCognitoLogoutUrl(
          configuration.cognitoDomain,
          configuration.clientId,
          configuration.logoutUri,
        ),
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Cognito sign-out failed.',
          errorName: error instanceof Error ? error.name : 'UnknownError',
        }),
      );
      setSignOutError('Unable to sign out. Please try again.');
    }
  }, [
    configuration.clientId,
    configuration.cognitoDomain,
    configuration.logoutUri,
    removeUser,
  ]);

  const userEmail =
    typeof auth.user?.profile.email === 'string'
      ? auth.user.profile.email
      : undefined;

  return (
    <Routes>
      <Route
        path="/login"
        element={
          auth.isAuthenticated && accessToken && !sessionExpired ? (
            <Navigate to="/" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/"
        element={
          sessionExpired ? (
            <LoginPage sessionExpired />
          ) : (
            <ProtectedRoute>
              <InventoryDashboard
                loadProducts={loadProducts}
                onSignOut={handleSignOut}
                onUnauthorized={handleUnauthorized}
                signOutError={signOutError}
                userEmail={userEmail}
              />
            </ProtectedRoute>
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
