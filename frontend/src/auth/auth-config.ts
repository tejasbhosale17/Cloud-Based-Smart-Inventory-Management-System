const authEnvironmentKeys = [
  'VITE_API_BASE_URL',
  'VITE_COGNITO_AUTHORITY',
  'VITE_COGNITO_CLIENT_ID',
  'VITE_COGNITO_DOMAIN',
] as const;

export interface FrontendConfiguration {
  apiBaseUrl: string;
  authority: string;
  clientId: string;
  cognitoDomain: string;
  redirectUri: string;
  logoutUri: string;
}

interface ConfigurationResult {
  configuration?: FrontendConfiguration;
  missingVariables: string[];
  error?: string;
}

type AuthEnvironment = Partial<
  Record<(typeof authEnvironmentKeys)[number], string>
> & {
  VITE_COGNITO_REDIRECT_URI?: string;
  VITE_COGNITO_LOGOUT_URI?: string;
};

function isSecureWebUrl(value: string, allowLocalHttp: boolean): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' ||
      (allowLocalHttp &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

export function readFrontendConfiguration(
  environment: AuthEnvironment,
  browserOrigin: string,
): ConfigurationResult {
  const apiBaseUrlValue = environment.VITE_API_BASE_URL?.trim();
  const authorityValue = environment.VITE_COGNITO_AUTHORITY?.trim();
  const clientId = environment.VITE_COGNITO_CLIENT_ID?.trim();
  const cognitoDomainValue = environment.VITE_COGNITO_DOMAIN?.trim();
  const missingVariables = authEnvironmentKeys.filter(
    (key) => !environment[key]?.trim(),
  );
  if (
    missingVariables.length > 0 ||
    !apiBaseUrlValue ||
    !authorityValue ||
    !clientId ||
    !cognitoDomainValue
  ) {
    return { missingVariables };
  }

  const apiBaseUrl = apiBaseUrlValue.replace(/\/+$/, '');
  const authority = authorityValue.replace(/\/+$/, '');
  const cognitoDomain = cognitoDomainValue.replace(/\/+$/, '');
  const redirectUri =
    environment.VITE_COGNITO_REDIRECT_URI?.trim() || browserOrigin;
  const logoutUri =
    environment.VITE_COGNITO_LOGOUT_URI?.trim() || browserOrigin;

  if (
    !isSecureWebUrl(apiBaseUrl, true) ||
    !isSecureWebUrl(authority, false) ||
    !isSecureWebUrl(cognitoDomain, false) ||
    !isSecureWebUrl(redirectUri, true) ||
    !isSecureWebUrl(logoutUri, true)
  ) {
    return {
      missingVariables: [],
      error:
        'Use HTTPS for the API and Cognito URLs. HTTP is allowed only for localhost development.',
    };
  }

  return {
    configuration: {
      apiBaseUrl,
      authority,
      clientId,
      cognitoDomain,
      redirectUri,
      logoutUri,
    },
    missingVariables: [],
  };
}
