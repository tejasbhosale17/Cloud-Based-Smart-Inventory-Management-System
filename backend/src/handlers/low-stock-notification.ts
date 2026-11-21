import type {
  DynamoDBBatchResponse,
  DynamoDBRecord,
  DynamoDBStreamEvent,
  AttributeValue,
} from 'aws-lambda';

export interface LowStockAlert {
  productId: string;
  productName: string;
  quantity: number;
  lowStockThreshold: number;
}

export interface LowStockPublisher {
  publish(alert: LowStockAlert): Promise<void>;
}

type LowStockNotificationHandler = (
  event: DynamoDBStreamEvent,
) => Promise<DynamoDBBatchResponse>;

interface ProductStock {
  productId: string;
  productName: string;
  quantity: number;
  lowStockThreshold: number;
}

function readStringAttribute(
  image: Record<string, AttributeValue>,
  field: string,
): string {
  const attribute = image[field];
  const value = attribute && 'S' in attribute ? attribute.S : undefined;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`DynamoDB stream record has an invalid ${field} value.`);
  }
  return value;
}

function readIntegerAttribute(
  image: Record<string, AttributeValue>,
  field: string,
): number {
  const attribute = image[field];
  const value = attribute && 'N' in attribute ? Number(attribute.N) : NaN;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`DynamoDB stream record has an invalid ${field} value.`);
  }
  return value;
}

function readProductStock(
  image: Record<string, AttributeValue> | undefined,
): ProductStock {
  if (!image) {
    throw new Error('DynamoDB stream record is missing an image.');
  }

  return {
    productId: readStringAttribute(image, 'productId'),
    productName: readStringAttribute(image, 'name'),
    quantity: readIntegerAttribute(image, 'quantity'),
    lowStockThreshold: readIntegerAttribute(image, 'lowStockThreshold'),
  };
}

function getLowStockAlert(record: DynamoDBRecord): LowStockAlert | undefined {
  if (record.eventName !== 'INSERT' && record.eventName !== 'MODIFY') {
    return undefined;
  }

  const newStock = readProductStock(record.dynamodb?.NewImage);
  if (newStock.quantity > newStock.lowStockThreshold) {
    return undefined;
  }

  if (record.eventName === 'INSERT') {
    return {
      productId: newStock.productId,
      productName: newStock.productName,
      quantity: newStock.quantity,
      lowStockThreshold: newStock.lowStockThreshold,
    };
  }

  const oldStock = readProductStock(record.dynamodb?.OldImage);
  if (oldStock.quantity <= oldStock.lowStockThreshold) {
    return undefined;
  }

  return {
    productId: newStock.productId,
    productName: newStock.productName,
    quantity: newStock.quantity,
    lowStockThreshold: newStock.lowStockThreshold,
  };
}

export function createLowStockNotificationHandler(
  publisher: LowStockPublisher,
): LowStockNotificationHandler {
  return async (event: DynamoDBStreamEvent): Promise<DynamoDBBatchResponse> => {
    const batchItemFailures: DynamoDBBatchResponse['batchItemFailures'] = [];

    for (const record of event.Records) {
      try {
        const alert = getLowStockAlert(record);
        if (alert) {
          await publisher.publish(alert);
        }
      } catch (error) {
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'Low-stock notification failed.',
            eventId: record.eventID,
            errorName: error instanceof Error ? error.name : 'UnknownError',
          }),
        );

        const sequenceNumber = record.dynamodb?.SequenceNumber;
        if (!sequenceNumber) {
          throw new Error(
            'DynamoDB stream record is missing its sequence number.',
          );
        }
        batchItemFailures.push({ itemIdentifier: sequenceNumber });
      }
    }

    return { batchItemFailures };
  };
}
