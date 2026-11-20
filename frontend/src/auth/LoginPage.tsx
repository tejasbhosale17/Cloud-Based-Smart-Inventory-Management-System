import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

interface LoginPageProps {
  sessionExpired?: boolean;
}

function LoginPage({
  sessionExpired: hasExpiredSession = false,
}: LoginPageProps) {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const [actionError, setActionError] = useState('');
  const [isStartingSignIn, setIsStartingSignIn] = useState(false);
  const sessionExpired =
    hasExpiredSession || searchParams.get('reason') === 'session-expired';

  if (auth.isLoading) {
    return (
      <main className="auth-screen">
        <p role="status">Checking your sign-in status…</p>
      </main>
    );
  }

  if (auth.isAuthenticated && auth.user?.access_token && !sessionExpired) {
    return <Navigate to="/" replace />;
  }

  async function startSignIn() {
    setActionError('');
    setIsStartingSignIn(true);

    try {
      await auth.signinRedirect();
    } catch {
      setActionError('Unable to start sign-in. Please try again.');
      setIsStartingSignIn(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="login-title">
        <span className="brand-mark auth-brand-mark" aria-hidden="true">
          SI
        </span>
        <p className="eyebrow">EMPLOYEE PORTAL</p>
        <h1 id="login-title">Welcome to Smart Inventory</h1>
        <p>Sign in with your employee account to view and manage inventory.</p>
        {sessionExpired && (
          <p className="auth-notice" role="status">
            Your session expired. Sign in again to continue.
          </p>
        )}
        {(auth.error || actionError) && (
          <p className="auth-error" role="alert">
            {actionError || 'Sign-in could not be completed. Please try again.'}
          </p>
        )}
        <button
          className="button button-primary auth-submit"
          disabled={isStartingSignIn}
          onClick={() => void startSignIn()}
          type="button"
        >
          {isStartingSignIn
            ? 'Connecting to secure sign-in…'
            : 'Sign in or create an account'}
        </button>
        <p className="auth-help">
          New employees can choose <strong>Sign up</strong> on the secure
          Cognito sign-in page.
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
