import { UnauthorizedRequestError } from './products';
import type { Sale } from '../types/sale';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSale(value: unknown): value is Sale {
  return (
    isRecord(value) &&
    typeof value.saleId === 'string' &&
    typeof value.productId === 'string' &&
    typeof value.quantity === 'number' &&
    typeof value.unitPrice === 'number' &&
    typeof value.totalAmount === 'number' &&
    typeof value.soldAt === 'string'
  );
}

function buildSalesUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  if (
    url.protocol !== 'https:' &&
    !(
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname)
    )
  ) {
    throw new Error('The sales API must use HTTPS outside localhost.');
  }
  if (url.search || url.hash) {
    throw new Error('VITE_API_BASE_URL must not include a query or fragment.');
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}/sales`;
}

export async function createSale(
  apiBaseUrl: string,
  accessToken: string,
  productId: string,
  quantity: number,
  fetcher: typeof fetch = fetch,
): Promise<Sale> {
  if (!accessToken.trim()) {
    throw new UnauthorizedRequestError();
  }

  const response = await fetcher(buildSalesUrl(apiBaseUrl), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ productId, quantity }),
  });

  if (response.status === 401) {
    throw new UnauthorizedRequestError();
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Sales API returned invalid JSON.');
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === 'string'
        ? payload.message
        : `Sales API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (
    !isRecord(payload) ||
    !isSale(payload.sale) ||
    payload.sale.productId !== productId ||
    payload.sale.quantity !== quantity
  ) {
    throw new Error('Sales API returned an invalid sale.');
  }

  return payload.sale;
}
