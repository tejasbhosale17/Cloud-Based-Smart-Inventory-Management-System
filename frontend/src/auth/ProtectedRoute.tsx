import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <main className="auth-screen">
        <p role="status">Checking your sign-in status…</p>
      </main>
    );
  }

  if (!auth.isAuthenticated || !auth.user?.access_token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
