// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createCognitoLogoutUrl } from './cognito-logout';

describe('createCognitoLogoutUrl', () => {
  it('builds a Cognito logout URL with encoded client and return settings', () => {
    const url = new URL(
      createCognitoLogoutUrl(
        'https://inventory.auth.us-east-1.amazoncognito.com',
        'client-id',
        'http://localhost:5173',
      ),
    );

    expect(url.origin).toBe(
      'https://inventory.auth.us-east-1.amazoncognito.com',
    );
    expect(url.pathname).toBe('/logout');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('logout_uri')).toBe('http://localhost:5173');
  });
});
