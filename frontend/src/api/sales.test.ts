// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { createSale } from './sales';
import { UnauthorizedRequestError } from './products';

const sale = {
  saleId: 'sale-1',
  productId: 'product-1',
  quantity: 2,
  unitPrice: 4.99,
  totalAmount: 9.98,
  soldAt: '2026-01-01T00:00:00.000Z',
};

describe('createSale', () => {
  it('sends an authenticated sale request and validates the response', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ sale }), { status: 201 }),
      );

    await expect(
      createSale(
        'https://api.example.test/dev/',
        'access-token',
        'product-1',
        2,
        fetcher,
      ),
    ).resolves.toEqual(sale);

    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example.test/dev/sales',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ productId: 'product-1', quantity: 2 }),
      }),
    );
  });

  it('maps unauthorized responses to the session error', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 401 }));

    await expect(
      createSale(
        'https://api.example.test/dev',
        'expired',
        'product-1',
        1,
        fetcher,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedRequestError);
  });

  it('surfaces insufficient-stock errors from the API', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ message: 'Insufficient stock for this sale.' }),
        {
          status: 409,
        },
      ),
    );

    await expect(
      createSale(
        'https://api.example.test/dev',
        'access-token',
        'product-1',
        8,
        fetcher,
      ),
    ).rejects.toThrow('Insufficient stock');
  });
});
