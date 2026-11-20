import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import { WebStorageStateStore } from 'oidc-client-ts';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AuthConfigurationScreen from './auth/AuthConfigurationScreen';
import { readFrontendConfiguration } from './auth/auth-config';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
const result = readFrontendConfiguration(
  import.meta.env,
  window.location.origin,
);

if (!result.configuration) {
  root.render(
    <React.StrictMode>
      <AuthConfigurationScreen
        error={result.error}
        missingVariables={result.missingVariables}
      />
    </React.StrictMode>,
  );
} else {
  const { configuration } = result;
  const userStore = new WebStorageStateStore({ store: window.sessionStorage });
  const stateStore = new WebStorageStateStore({ store: window.sessionStorage });

  root.render(
    <React.StrictMode>
      <AuthProvider
        authority={configuration.authority}
        client_id={configuration.clientId}
        redirect_uri={configuration.redirectUri}
        post_logout_redirect_uri={configuration.logoutUri}
        response_type="code"
        scope="openid email profile"
        userStore={userStore}
        stateStore={stateStore}
        automaticSilentRenew={false}
        monitorSession={false}
        onSigninCallback={() =>
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          )
        }
      >
        <BrowserRouter>
          <App configuration={configuration} />
        </BrowserRouter>
      </AuthProvider>
    </React.StrictMode>,
  );
}
