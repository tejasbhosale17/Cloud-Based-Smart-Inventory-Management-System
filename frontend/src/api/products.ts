import type { Product } from '../types/product';

export class UnauthorizedRequestError extends Error {
  constructor() {
    super('Your session is no longer authorized.');
    this.name = 'UnauthorizedRequestError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProduct(value: unknown): value is Product {
  return (
    isRecord(value) &&
    typeof value.productId === 'string' &&
    typeof value.name === 'string' &&
    typeof value.category === 'string' &&
    typeof value.price === 'number' &&
    typeof value.quantity === 'number' &&
    typeof value.lowStockThreshold === 'number'
  );
}

function buildProductsUrl(apiBaseUrl: string): string {
  let baseUrl: URL;
  try {
    baseUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error('VITE_API_BASE_URL must be a valid absolute URL.');
  }

  if (baseUrl.protocol !== 'https:' && baseUrl.protocol !== 'http:') {
    throw new Error('VITE_API_BASE_URL must use HTTP or HTTPS.');
  }
  if (
    baseUrl.protocol === 'http:' &&
    !['localhost', '127.0.0.1'].includes(baseUrl.hostname)
  ) {
    throw new Error('The product API must use HTTPS outside localhost.');
  }
  if (baseUrl.search || baseUrl.hash) {
    throw new Error('VITE_API_BASE_URL must not include a query or fragment.');
  }

  const path = baseUrl.pathname.replace(/\/+$/, '');
  return `${baseUrl.origin}${path}/products`;
}

export async function fetchProducts(
  apiBaseUrl: string,
  accessToken: string,
  fetcher: typeof fetch = fetch,
): Promise<Product[]> {
  if (!accessToken.trim()) {
    throw new UnauthorizedRequestError();
  }

  const response = await fetcher(buildProductsUrl(apiBaseUrl), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 401) {
    throw new UnauthorizedRequestError();
  }
  if (!response.ok) {
    throw new Error(
      `Product API request failed with status ${response.status}.`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Product API returned invalid JSON.');
  }

  if (
    !isRecord(payload) ||
    !Array.isArray(payload.products) ||
    !payload.products.every(isProduct)
  ) {
    throw new Error('Product API returned an invalid product list.');
  }

  return payload.products;
}
