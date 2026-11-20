interface AuthConfigurationScreenProps {
  error?: string;
  missingVariables: string[];
}

function AuthConfigurationScreen({
  error,
  missingVariables,
}: AuthConfigurationScreenProps) {
  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="config-title">
        <span className="brand-mark auth-brand-mark" aria-hidden="true">
          SI
        </span>
        <h1 id="config-title">Authentication setup required</h1>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <>
            <p>
              Add the Cognito and API outputs to your local frontend environment
              before signing in.
            </p>
            <ul>
              {missingVariables.map((variable) => (
                <li key={variable}>
                  <code>{variable}</code>
                </li>
              ))}
            </ul>
            <p>
              Copy <code>frontend/.env.example</code> to{' '}
              <code>frontend/.env.local</code> and fill in the values.
            </p>
          </>
        )}
      </section>
    </main>
  );
}

export default AuthConfigurationScreen;
