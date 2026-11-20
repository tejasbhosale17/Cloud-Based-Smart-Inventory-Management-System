// @vitest-environment node

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProductHandlers } from './product-handlers.js';
import type { ProductRepository } from '../products/product-repository.js';
import type { Product, ProductInput } from '../products/product.js';

class InMemoryProductRepository implements ProductRepository {
  readonly products = new Map<string, Product>();

  async create(product: Product): Promise<void> {
    this.products.set(product.productId, product);
  }

  async list(): Promise<Product[]> {
    return [...this.products.values()];
  }

  async get(productId: string): Promise<Product | undefined> {
    return this.products.get(productId);
  }

  async update(
    productId: string,
    input: ProductInput,
    updatedAt: string,
  ): Promise<Product | undefined> {
    const existingProduct = this.products.get(productId);
    if (!existingProduct) {
      return undefined;
    }

    const updatedProduct = { ...existingProduct, ...input, updatedAt };
    this.products.set(productId, updatedProduct);
    return updatedProduct;
  }

  async delete(productId: string): Promise<boolean> {
    return this.products.delete(productId);
  }
}

const productInput: ProductInput = {
  name: 'Classic Notebook',
  category: 'Stationery',
  price: 4.99,
  quantity: 120,
  lowStockThreshold: 25,
};

function createEvent(
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: '/products',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: 'test-account',
      apiId: 'test-api',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      http: {
        method: 'GET',
        path: '/products',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'unit-test',
      },
      requestId: 'test-request',
      routeKey: '$default',
      stage: 'test',
      time: '2026-01-01T00:00:00Z',
      timeEpoch: 0,
    },
    isBase64Encoded: false,
    ...overrides,
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

describe('product handlers', () => {
  it('creates a validated product and returns it in the list and item routes', async () => {
    const repository = new InMemoryProductRepository();
    const handlers = createProductHandlers(repository);
    const createdResponse = await handlers.createProduct(
      createEvent({
        body: JSON.stringify({ ...productInput, name: ' Classic Notebook ' }),
      }),
    );
    const created = responseBody<{ product: Product }>(
      createdResponse.body,
    ).product;

    expect(createdResponse.statusCode).toBe(201);
    expect(createdResponse.headers?.location).toBe(
      `/products/${created.productId}`,
    );
    expect(created.name).toBe('Classic Notebook');
    expect(created.createdAt).toBe(created.updatedAt);

    const listResponse = await handlers.listProducts(createEvent());
    expect(
      responseBody<{ products: Product[] }>(listResponse.body).products,
    ).toEqual([created]);

    const getResponse = await handlers.getProduct(
      createEvent({ pathParameters: { productId: created.productId } }),
    );
    expect(getResponse.statusCode).toBe(200);
    expect(
      responseBody<{ product: Product }>(getResponse.body).product,
    ).toEqual(created);
  });

  it('rejects invalid bodies and does not persist invalid products', async () => {
    const repository = new InMemoryProductRepository();
    const handlers = createProductHandlers(repository);

    const response = await handlers.createProduct(
      createEvent({
        body: JSON.stringify({ ...productInput, quantity: -1 }),
      }),
    );

    expect(response.statusCode).toBe(400);
    expect(responseBody<{ message: string }>(response.body).message).toContain(
      'quantity',
    );
    expect(repository.products.size).toBe(0);
  });

  it('updates product fields without changing the creation timestamp', async () => {
    const repository = new InMemoryProductRepository();
    const existingProduct: Product = {
      ...productInput,
      productId: 'product-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    repository.products.set(existingProduct.productId, existingProduct);
    const handlers = createProductHandlers(repository);

    const response = await handlers.updateProduct(
      createEvent({
        body: JSON.stringify({ ...productInput, quantity: 9 }),
        pathParameters: { productId: existingProduct.productId },
      }),
    );
    const updated = responseBody<{ product: Product }>(response.body).product;

    expect(response.statusCode).toBe(200);
    expect(updated.quantity).toBe(9);
    expect(updated.createdAt).toBe(existingProduct.createdAt);
    expect(updated.updatedAt).not.toBe(existingProduct.updatedAt);
  });

  it('returns not found when retrieving, updating, or deleting a missing product', async () => {
    const handlers = createProductHandlers(new InMemoryProductRepository());
    const event = createEvent({
      body: JSON.stringify(productInput),
      pathParameters: { productId: 'missing-product' },
    });

    expect((await handlers.getProduct(event)).statusCode).toBe(404);
    expect((await handlers.updateProduct(event)).statusCode).toBe(404);
    expect((await handlers.deleteProduct(event)).statusCode).toBe(404);
  });

  it('returns a bodyless success when deleting a product', async () => {
    const repository = new InMemoryProductRepository();
    const product: Product = {
      ...productInput,
      productId: 'product-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    repository.products.set(product.productId, product);
    const handlers = createProductHandlers(repository);

    const response = await handlers.deleteProduct(
      createEvent({ pathParameters: { productId: product.productId } }),
    );

    expect(response.statusCode).toBe(204);
    expect(response.body).toBeUndefined();
    expect(repository.products.has(product.productId)).toBe(false);
  });

  it('logs unexpected failures without returning internal details', async () => {
    const repository = new InMemoryProductRepository();
    vi.spyOn(repository, 'list').mockRejectedValue(
      new Error('database connection detail'),
    );
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handlers = createProductHandlers(repository);

    const response = await handlers.listProducts(createEvent());

    expect(response.statusCode).toBe(500);
    expect(responseBody<{ message: string }>(response.body)).toEqual({
      message: 'Internal server error.',
    });
    expect(logError).toHaveBeenCalledOnce();
    expect(logError.mock.calls[0]?.[0]).not.toContain(
      'database connection detail',
    );
  });
});
