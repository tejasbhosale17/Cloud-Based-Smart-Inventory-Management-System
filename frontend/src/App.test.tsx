// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { fetchProducts, UnauthorizedRequestError } from './api/products';

const authState = vi.hoisted(() => ({
  isLoading: false,
  isAuthenticated: false,
  user: null as {
    access_token: string;
    profile: { email: string };
  } | null,
  signinRedirect: vi.fn(),
  removeUser: vi.fn(),
}));

vi.mock('react-oidc-context', () => ({
  useAuth: () => authState,
}));

vi.mock('./CategoryInventoryChart', () => ({
  default: () => <section aria-label="Stock by category" />,
}));

vi.mock('./api/products', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/products')>();
  return { ...actual, fetchProducts: vi.fn() };
});

const configuration = {
  apiBaseUrl: 'https://api.example.test/dev',
  authority: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example',
  clientId: 'public-client-id',
  cognitoDomain: 'https://inventory.auth.us-east-1.amazoncognito.com',
  redirectUri: 'http://localhost:5173',
  logoutUri: 'http://localhost:5173',
};

const product = {
  productId: 'notebook',
  name: 'Classic Notebook',
  category: 'Stationery',
  price: 4.99,
  quantity: 12,
  lowStockThreshold: 5,
};

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App configuration={configuration} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  authState.isLoading = false;
  authState.isAuthenticated = false;
  authState.user = null;
  authState.signinRedirect.mockReset();
  authState.removeUser.mockReset().mockResolvedValue(undefined);
  vi.mocked(fetchProducts).mockReset().mockResolvedValue([product]);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('authenticated application routes', () => {
  it('redirects an unauthenticated visitor to sign-in', async () => {
    renderApp();

    expect(
      await screen.findByRole('heading', {
        name: 'Welcome to Smart Inventory',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Classic Notebook')).not.toBeInTheDocument();
  });

  it('starts Cognito sign-in from the login page', async () => {
    renderApp('/login');

    fireEvent.click(
      screen.getByRole('button', { name: 'Sign in or create an account' }),
    );

    await waitFor(() =>
      expect(authState.signinRedirect).toHaveBeenCalledOnce(),
    );
  });

  it('loads the inventory with the signed-in access token', async () => {
    authState.isAuthenticated = true;
    authState.user = {
      access_token: 'employee-access-token',
      profile: { email: 'employee@example.test' },
    };

    renderApp();

    expect(await screen.findByText('Classic Notebook')).toBeInTheDocument();
    expect(fetchProducts).toHaveBeenCalledWith(
      configuration.apiBaseUrl,
      'employee-access-token',
    );
  });

  it('clears the session and returns to sign-in after an API 401', async () => {
    authState.isAuthenticated = true;
    authState.user = {
      access_token: 'expired-access-token',
      profile: { email: 'employee@example.test' },
    };
    authState.removeUser.mockImplementation(async () => {
      authState.isAuthenticated = false;
      authState.user = null;
    });
    vi.mocked(fetchProducts).mockRejectedValueOnce(
      new UnauthorizedRequestError(),
    );

    renderApp();

    expect(
      await screen.findByText(
        'Your session expired. Sign in again to continue.',
      ),
    ).toBeInTheDocument();
    expect(authState.removeUser).toHaveBeenCalledOnce();
  });

  it('keeps the session-expired route blocked if local session removal fails', async () => {
    authState.isAuthenticated = true;
    authState.user = {
      access_token: 'expired-access-token',
      profile: { email: 'employee@example.test' },
    };
    authState.removeUser.mockRejectedValueOnce(
      new Error('Storage unavailable'),
    );
    vi.mocked(fetchProducts).mockRejectedValueOnce(
      new UnauthorizedRequestError(),
    );

    renderApp();

    expect(
      await screen.findByText(
        'Your session expired. Sign in again to continue.',
      ),
    ).toBeInTheDocument();
    expect(authState.removeUser).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole('heading', { name: 'Product inventory' }),
    ).not.toBeInTheDocument();
  });
});
