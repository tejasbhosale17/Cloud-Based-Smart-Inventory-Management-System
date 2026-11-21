import type { DynamoDBStreamEvent } from 'aws-lambda';
import { createLowStockNotificationHandler } from './low-stock-notification.js';
import { createSnsLowStockPublisher } from '../notifications/sns-low-stock-publisher.js';

let handler: ReturnType<typeof createLowStockNotificationHandler> | undefined;

export function notifyLowStock(event: DynamoDBStreamEvent) {
  handler ??= createLowStockNotificationHandler(createSnsLowStockPublisher());
  return handler(event);
}
