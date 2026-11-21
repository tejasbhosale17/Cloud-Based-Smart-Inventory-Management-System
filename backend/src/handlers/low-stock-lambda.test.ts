// @vitest-environment node

import type { DynamoDBStreamEvent } from 'aws-lambda';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createPublisher: vi.fn(),
  createHandler: vi.fn(),
  streamHandler: vi.fn(),
}));

vi.mock('./low-stock-notification.js', () => ({
  createLowStockNotificationHandler: mocks.createHandler,
}));

vi.mock('../notifications/sns-low-stock-publisher.js', () => ({
  createSnsLowStockPublisher: mocks.createPublisher,
}));

import { notifyLowStock } from './low-stock-lambda.js';

afterEach(() => {
  vi.clearAllMocks();
});

describe('low-stock Lambda composition', () => {
  it('creates the SNS client and handler on invocation, not during module loading', async () => {
    const publisher = { publish: vi.fn() };
    const response = { batchItemFailures: [] };
    mocks.createPublisher.mockReturnValue(publisher);
    mocks.createHandler.mockReturnValue(mocks.streamHandler);
    mocks.streamHandler.mockResolvedValue(response);

    expect(mocks.createPublisher).not.toHaveBeenCalled();

    await expect(
      notifyLowStock({ Records: [] } satisfies DynamoDBStreamEvent),
    ).resolves.toBe(response);

    expect(mocks.createPublisher).toHaveBeenCalledOnce();
    expect(mocks.createHandler).toHaveBeenCalledWith(publisher);
    expect(mocks.streamHandler).toHaveBeenCalledWith({ Records: [] });
  });
});
