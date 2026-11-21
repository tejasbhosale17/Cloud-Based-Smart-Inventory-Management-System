// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { DynamoDbSaleRepository } from './dynamodb-sale-repository.js';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

function createRepository(
  send: ReturnType<typeof vi.fn>,
): DynamoDbSaleRepository {
  return new DynamoDbSaleRepository(
    { send } as unknown as DynamoDBDocumentClient,
    'products-table',
    'sales-table',
  );
}

describe('DynamoDbSaleRepository', () => {
  it('reads the price then atomically updates stock and stores the sale', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Item: { productId: 'product-1', price: 4.99, quantity: 10 },
      })
      .mockResolvedValueOnce({});
    const repository = createRepository(send);

    const sale = await repository.createSale(
      'product-1',
      2,
      'sale-1',
      '2026-01-01T00:00:00.000Z',
    );

    expect(sale).toEqual({
      saleId: 'sale-1',
      productId: 'product-1',
      quantity: 2,
      unitPrice: 4.99,
      totalAmount: 9.98,
      soldAt: '2026-01-01T00:00:00.000Z',
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]?.[0].input).toMatchObject({
      TransactItems: [
        {
          Update: {
            TableName: 'products-table',
            ConditionExpression:
              'attribute_exists(#productId) AND #quantity >= :quantity',
          },
        },
        {
          Put: {
            TableName: 'sales-table',
            Item: sale,
          },
        },
      ],
    });
  });

  it('rejects a sale when the product cannot be found', async () => {
    const send = vi.fn().mockResolvedValueOnce({});
    const repository = createRepository(send);

    await expect(
      repository.createSale('missing-product', 1, 'sale-1', '2026-01-01'),
    ).rejects.toThrow('Product not found');
    expect(send).toHaveBeenCalledOnce();
  });

  it('classifies a canceled stock update using a consistent read, not stale stock', async () => {
    const transactionError = new TransactionCanceledException({
      message: 'Transaction canceled.',
      $metadata: { httpStatusCode: 400 },
      CancellationReasons: [
        { Code: 'ConditionalCheckFailed', Message: 'Condition not met.' },
        { Code: 'None' },
      ],
    });
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Item: { productId: 'product-1', price: 4.99, quantity: 5 },
      })
      .mockRejectedValueOnce(transactionError)
      .mockResolvedValueOnce({
        Item: { productId: 'product-1', price: 4.99, quantity: 1 },
      });
    const repository = createRepository(send);

    await expect(
      repository.createSale(
        'product-1',
        2,
        'sale-1',
        '2026-01-01T00:00:00.000Z',
      ),
    ).rejects.toThrow('Insufficient stock');

    const transactionInput = send.mock.calls[1]?.[0].input;
    expect(transactionInput?.TransactItems).toHaveLength(2);
    expect(
      transactionInput?.TransactItems[0]?.Update?.ConditionExpression,
    ).toBe('attribute_exists(#productId) AND #quantity >= :quantity');
    expect(transactionInput?.TransactItems[1]?.Put?.TableName).toBe(
      'sales-table',
    );
    expect(send.mock.calls[2]?.[0].input).toMatchObject({
      TableName: 'products-table',
      Key: { productId: 'product-1' },
      ConsistentRead: true,
    });
  });

  it('returns product-not-found only when a canceled transaction reread finds no product', async () => {
    const transactionError = new TransactionCanceledException({
      message: 'Transaction canceled.',
      $metadata: { httpStatusCode: 400 },
      CancellationReasons: [
        { Code: 'ConditionalCheckFailed', Message: 'Condition not met.' },
        { Code: 'None' },
      ],
    });
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Item: { productId: 'product-1', price: 4.99, quantity: 5 },
      })
      .mockRejectedValueOnce(transactionError)
      .mockResolvedValueOnce({});
    const repository = createRepository(send);

    await expect(
      repository.createSale(
        'product-1',
        2,
        'sale-1',
        '2026-01-01T00:00:00.000Z',
      ),
    ).rejects.toThrow('Product not found');
    expect(send).toHaveBeenCalledTimes(3);
  });
});
