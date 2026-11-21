// @vitest-environment node

import type {
  AttributeValue,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from 'aws-lambda';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLowStockNotificationHandler } from './low-stock-notification.js';
import type { LowStockAlert } from './low-stock-notification.js';

function image(
  quantity: number,
  lowStockThreshold: number,
  productName = 'Classic Notebook',
): Record<string, AttributeValue> {
  return {
    productId: { S: 'product-1' },
    name: { S: productName },
    quantity: { N: String(quantity) },
    lowStockThreshold: { N: String(lowStockThreshold) },
  };
}

function record(
  eventID: string,
  sequenceNumber: string,
  eventName: DynamoDBRecord['eventName'],
  newImage?: Record<string, AttributeValue>,
  oldImage?: Record<string, AttributeValue>,
): DynamoDBRecord {
  return {
    eventID,
    eventName,
    dynamodb: {
      SequenceNumber: sequenceNumber,
      NewImage: newImage,
      OldImage: oldImage,
    },
  };
}

function streamEvent(...records: DynamoDBRecord[]): DynamoDBStreamEvent {
  return { Records: records };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('low-stock notification handler', () => {
  it('notifies when a sale transitions inventory from healthy to low stock', async () => {
    const publish = vi.fn<(alert: LowStockAlert) => Promise<void>>();
    const handler = createLowStockNotificationHandler({ publish });

    const response = await handler(
      streamEvent(
        record('record-1', 'sequence-1', 'MODIFY', image(5, 5), image(6, 5)),
      ),
    );

    expect(response).toEqual({ batchItemFailures: [] });
    expect(publish).toHaveBeenCalledWith({
      productId: 'product-1',
      productName: 'Classic Notebook',
      quantity: 5,
      lowStockThreshold: 5,
    });
  });

  it('notifies for a newly created product that is already low stock', async () => {
    const publish = vi.fn<(alert: LowStockAlert) => Promise<void>>();
    const handler = createLowStockNotificationHandler({ publish });

    await handler(
      streamEvent(record('record-1', 'sequence-1', 'INSERT', image(2, 5))),
    );

    expect(publish).toHaveBeenCalledOnce();
    expect(publish.mock.calls[0]?.[0].quantity).toBe(2);
  });

  it('notifies when a threshold change makes existing stock low', async () => {
    const publish = vi.fn<(alert: LowStockAlert) => Promise<void>>();
    const handler = createLowStockNotificationHandler({ publish });

    await handler(
      streamEvent(
        record('record-1', 'sequence-1', 'MODIFY', image(10, 10), image(10, 5)),
      ),
    );

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        quantity: 10,
        lowStockThreshold: 10,
      }),
    );
  });

  it('does not repeat notifications while stock remains low or for unrelated changes', async () => {
    const publish = vi.fn<(alert: LowStockAlert) => Promise<void>>();
    const handler = createLowStockNotificationHandler({ publish });

    const response = await handler(
      streamEvent(
        record('record-1', 'sequence-1', 'MODIFY', image(4, 5), image(5, 5)),
        record('record-2', 'sequence-2', 'REMOVE', undefined, image(4, 5)),
        record('record-3', 'sequence-3', 'MODIFY', image(8, 5), image(9, 5)),
      ),
    );

    expect(response).toEqual({ batchItemFailures: [] });
    expect(publish).not.toHaveBeenCalled();
  });

  it('reports publish failures for stream retry without suppressing other records', async () => {
    const publish = vi
      .fn<(alert: LowStockAlert) => Promise<void>>()
      .mockRejectedValueOnce(new Error('SNS unavailable'))
      .mockResolvedValueOnce();
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createLowStockNotificationHandler({ publish });

    const response = await handler(
      streamEvent(
        record('record-1', 'sequence-1', 'MODIFY', image(5, 5), image(6, 5)),
        record(
          'record-2',
          'sequence-2',
          'MODIFY',
          image(3, 3, 'USB-C Cable'),
          image(4, 3, 'USB-C Cable'),
        ),
      ),
    );

    expect(response).toEqual({
      batchItemFailures: [{ itemIdentifier: 'sequence-1' }],
    });
    expect(publish).toHaveBeenCalledTimes(2);
    expect(logError).toHaveBeenCalledOnce();
  });

  it('fails malformed stream records explicitly and returns their sequence for retry', async () => {
    const publish = vi.fn<(alert: LowStockAlert) => Promise<void>>();
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = createLowStockNotificationHandler({ publish });

    const response = await handler(
      streamEvent(
        record('record-1', 'sequence-1', 'INSERT', {
          productId: { S: 'product-1' },
        }),
      ),
    );

    expect(response).toEqual({
      batchItemFailures: [{ itemIdentifier: 'sequence-1' }],
    });
    expect(publish).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledOnce();
  });
});
