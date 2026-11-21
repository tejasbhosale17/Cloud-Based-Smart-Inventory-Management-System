// @vitest-environment node

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSaleHandler } from './sale-handlers.js';
import {
  InsufficientStockError,
  ProductNotFoundForSaleError,
} from '../sales/sale-repository.js';
import type { SaleRepository } from '../sales/sale-repository.js';
import type { Sale } from '../sales/sale.js';

class InMemorySaleRepository implements SaleRepository {
  readonly calls: Array<{
    productId: string;
    quantity: number;
    saleId: string;
    soldAt: string;
  }> = [];
  nextResult: Sale | Error = {
    saleId: 'sale-1',
    productId: 'product-1',
    quantity: 2,
    unitPrice: 4.99,
    totalAmount: 9.98,
    soldAt: '2026-01-01T00:00:00.000Z',
  };

  async createSale(
    productId: string,
    quantity: number,
    saleId: string,
    soldAt: string,
  ): Promise<Sale> {
    this.calls.push({ productId, quantity, saleId, soldAt });
    if (this.nextResult instanceof Error) {
      throw this.nextResult;
    }
    return { ...this.nextResult, saleId, productId, quantity, soldAt };
  }
}

function createEvent(body: string | undefined): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'POST /sales',
    rawPath: '/sales',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      http: {
        method: 'POST',
        path: '/sales',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'unit-test',
      },
      requestId: 'test-request',
      routeKey: 'POST /sales',
      stage: 'test',
      time: '2026-01-01T00:00:00Z',
      timeEpoch: 0,
    },
    isBase64Encoded: false,
    body,
  };
}

function responseBody<T>(body: string | undefined): T {
  if (!body) {
    throw new Error('Expected a JSON response body.');
  }
  return JSON.parse(body) as T;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sale handler', () => {
  it('creates a sale from a validated product and quantity', async () => {
    const repository = new InMemorySaleRepository();
    const handler = createSaleHandler(repository);

    const response = await handler(
      createEvent(JSON.stringify({ productId: ' product-1 ', quantity: 2 })),
    );

    expect(response.statusCode).toBe(201);
    expect(repository.calls).toHaveLength(1);
    expect(repository.calls[0]).toMatchObject({
      productId: 'product-1',
      quantity: 2,
    });
    expect(responseBody<{ sale: Sale }>(response.body).sale).toMatchObject({
      productId: 'product-1',
      quantity: 2,
    });
  });

  it.each([
    undefined,
    JSON.stringify({ productId: 'product-1', quantity: 0 }),
    JSON.stringify({ productId: 'product-1', quantity: 1.5 }),
    JSON.stringify({ productId: '', quantity: 1 }),
    JSON.stringify({ productId: 'product-1', quantity: 1, extra: true }),
  ])('rejects invalid sale input: %s', async (body) => {
    const repository = new InMemorySaleRepository();
    const handler = createSaleHandler(repository);

    const response = await handler(createEvent(body));

    expect(response.statusCode).toBe(400);
    expect(repository.calls).toHaveLength(0);
  });

  it('returns conflict when stock is insufficient', async () => {
    const repository = new InMemorySaleRepository();
    repository.nextResult = new InsufficientStockError();
    const handler = createSaleHandler(repository);

    const response = await handler(
      createEvent(JSON.stringify({ productId: 'product-1', quantity: 99 })),
    );

    expect(response.statusCode).toBe(409);
    expect(responseBody<{ message: string }>(response.body).message).toContain(
      'Insufficient stock',
    );
  });

  it('returns not found when the product does not exist', async () => {
    const repository = new InMemorySaleRepository();
    repository.nextResult = new ProductNotFoundForSaleError();
    const handler = createSaleHandler(repository);

    const response = await handler(
      createEvent(JSON.stringify({ productId: 'missing', quantity: 1 })),
    );

    expect(response.statusCode).toBe(404);
  });

  it('does not expose unexpected repository errors', async () => {
    const repository = new InMemorySaleRepository();
    repository.nextResult = new Error('database connection detail');
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createSaleHandler(repository);

    const response = await handler(
      createEvent(JSON.stringify({ productId: 'product-1', quantity: 1 })),
    );

    expect(response.statusCode).toBe(500);
    expect(responseBody<{ message: string }>(response.body)).toEqual({
      message: 'Internal server error.',
    });
    expect(logError.mock.calls[0]?.[0]).not.toContain(
      'database connection detail',
    );
  });
});
