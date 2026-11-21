import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type {
  LowStockAlert,
  LowStockPublisher,
} from '../handlers/low-stock-notification.js';

export function createSnsLowStockPublisher(): LowStockPublisher {
  const topicArn = process.env.LOW_STOCK_TOPIC_ARN?.trim();
  if (!topicArn) {
    throw new Error('LOW_STOCK_TOPIC_ARN environment variable is required.');
  }

  const client = new SNSClient({});
  return {
    async publish(alert: LowStockAlert): Promise<void> {
      await client.send(
        new PublishCommand({
          TopicArn: topicArn,
          Subject: 'Low stock inventory alert',
          Message: [
            'A product has reached its low-stock threshold.',
            `Product: ${alert.productName}`,
            `Product ID: ${alert.productId}`,
            `Units remaining: ${alert.quantity}`,
            `Low-stock threshold: ${alert.lowStockThreshold}`,
          ].join('\n'),
        }),
      );
    },
  };
}
