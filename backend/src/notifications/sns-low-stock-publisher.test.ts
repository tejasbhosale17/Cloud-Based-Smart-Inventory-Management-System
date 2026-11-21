// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSnsLowStockPublisher } from './sns-low-stock-publisher.js';

const snsMock = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: class MockSNSClient {
    send = snsMock.send;
  },
  PublishCommand: class MockPublishCommand {
    constructor(readonly input: unknown) {}
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('SNS low-stock publisher', () => {
  it('publishes an email-ready alert to the configured topic', async () => {
    vi.stubEnv(
      'LOW_STOCK_TOPIC_ARN',
      'arn:aws:sns:us-east-1:123456789012:low-stock',
    );
    snsMock.send.mockResolvedValue({});
    const publisher = createSnsLowStockPublisher();

    await publisher.publish({
      productId: 'product-1',
      productName: 'Classic Notebook',
      quantity: 5,
      lowStockThreshold: 5,
    });

    expect(snsMock.send).toHaveBeenCalledOnce();
    expect(snsMock.send.mock.calls[0]?.[0]).toMatchObject({
      input: {
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:low-stock',
        Subject: 'Low stock inventory alert',
        Message: expect.stringContaining('Units remaining: 5'),
      },
    });
    expect(snsMock.send.mock.calls[0]?.[0]).toMatchObject({
      input: { Message: expect.stringContaining('Low-stock threshold: 5') },
    });
  });

  it('requires an SNS topic ARN', () => {
    vi.stubEnv('LOW_STOCK_TOPIC_ARN', '');

    expect(() => createSnsLowStockPublisher()).toThrow(
      'LOW_STOCK_TOPIC_ARN environment variable is required.',
    );
  });

  it('surfaces SNS publish failures to the stream handler', async () => {
    vi.stubEnv(
      'LOW_STOCK_TOPIC_ARN',
      'arn:aws:sns:us-east-1:123456789012:low-stock',
    );
    snsMock.send.mockRejectedValue(new Error('SNS unavailable'));
    const publisher = createSnsLowStockPublisher();

    await expect(
      publisher.publish({
        productId: 'product-1',
        productName: 'Classic Notebook',
        quantity: 5,
        lowStockThreshold: 5,
      }),
    ).rejects.toThrow('SNS unavailable');
  });
});
