// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { readFrontendConfiguration } from './auth-config';

const environment = {
  VITE_API_BASE_URL: 'https://api.example.test/dev/',
  VITE_COGNITO_AUTHORITY:
    'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example',
  VITE_COGNITO_CLIENT_ID: 'public-client-id',
  VITE_COGNITO_DOMAIN: 'https://inventory.auth.us-east-1.amazoncognito.com',
};

describe('readFrontendConfiguration', () => {
  it('uses the browser origin for local callback and logout URLs', () => {
    expect(
      readFrontendConfiguration(
        {
          ...environment,
          VITE_API_BASE_URL: 'http://localhost:3000/dev/',
        },
        'http://localhost:5173',
      ),
    ).toEqual({
      configuration: {
        apiBaseUrl: 'http://localhost:3000/dev',
        authority: environment.VITE_COGNITO_AUTHORITY,
        clientId: environment.VITE_COGNITO_CLIENT_ID,
        cognitoDomain: environment.VITE_COGNITO_DOMAIN,
        redirectUri: 'http://localhost:5173',
        logoutUri: 'http://localhost:5173',
      },
      missingVariables: [],
    });
  });

  it('reports missing values without constructing an incomplete configuration', () => {
    expect(
      readFrontendConfiguration(
        { VITE_API_BASE_URL: environment.VITE_API_BASE_URL },
        'http://localhost:5173',
      ),
    ).toEqual({
      missingVariables: [
        'VITE_COGNITO_AUTHORITY',
        'VITE_COGNITO_CLIENT_ID',
        'VITE_COGNITO_DOMAIN',
      ],
    });
  });

  it('rejects insecure non-local service and callback URLs', () => {
    expect(
      readFrontendConfiguration(
        {
          ...environment,
          VITE_API_BASE_URL: 'http://api.example.test',
          VITE_COGNITO_REDIRECT_URI: 'http://inventory.example.test',
        },
        'http://localhost:5173',
      ),
    ).toMatchObject({
      error: expect.stringContaining('Use HTTPS'),
      missingVariables: [],
    });
  });
});
