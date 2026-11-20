// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { fetchProducts, UnauthorizedRequestError } from './products';

const productsResponse = {
  products: [
    {
      productId: 'product-1',
      name: 'Notebook',
      category: 'Stationery',
      price: 4.99,
      quantity: 12,
      lowStockThreshold: 5,
    },
  ],
};

describe('fetchProducts', () => {
  it('sends the access token and returns validated products', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(productsResponse), { status: 200 }),
      );

    await expect(
      fetchProducts('https://api.example.test/dev/', 'access-token', fetcher),
    ).resolves.toEqual(productsResponse.products);

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.test/dev/products',
      expect.objectContaining({
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: 'Bearer access-token',
        },
      }),
    );
  });

  it('raises an unauthorized error for expired or missing access tokens', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));

    await expect(
      fetchProducts('https://api.example.test', 'expired-token', fetcher),
    ).rejects.toBeInstanceOf(UnauthorizedRequestError);
    await expect(
      fetchProducts('https://api.example.test', ' ', fetcher),
    ).rejects.toBeInstanceOf(UnauthorizedRequestError);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('does not send an access token over non-local HTTP', async () => {
    const fetcher = vi.fn<typeof fetch>();

    await expect(
      fetchProducts('http://api.example.test', 'access-token', fetcher),
    ).rejects.toThrow('must use HTTPS outside localhost');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects malformed product API responses', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ products: [{ name: 'Incomplete' }] }), {
        status: 200,
      }),
    );

    await expect(
      fetchProducts('https://api.example.test', 'access-token', fetcher),
    ).rejects.toThrow('invalid product list');
  });
});
