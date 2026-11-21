import {
  DynamoDBClient,
  TransactionCanceledException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  InsufficientStockError,
  ProductNotFoundForSaleError,
} from './sale-repository.js';
import type { SaleRepository } from './sale-repository.js';
import type { Sale } from './sale.js';

export class DynamoDbSaleRepository implements SaleRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly productsTableName: string,
    private readonly salesTableName: string,
  ) {}

  async createSale(
    productId: string,
    quantity: number,
    saleId: string,
    soldAt: string,
  ): Promise<Sale> {
    const productResponse = await this.client.send(
      new GetCommand({
        TableName: this.productsTableName,
        Key: { productId },
      }),
    );
    const product = productResponse.Item;

    if (
      !product ||
      typeof product.price !== 'number' ||
      !Number.isFinite(product.price) ||
      typeof product.quantity !== 'number' ||
      !Number.isSafeInteger(product.quantity)
    ) {
      throw new ProductNotFoundForSaleError();
    }

    const sale: Sale = {
      saleId,
      productId,
      quantity,
      unitPrice: product.price,
      totalAmount: product.price * quantity,
      soldAt,
    };

    try {
      await this.client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: this.productsTableName,
                Key: { productId },
                UpdateExpression:
                  'SET #quantity = #quantity - :quantity, #updatedAt = :updatedAt',
                ConditionExpression:
                  'attribute_exists(#productId) AND #quantity >= :quantity',
                ExpressionAttributeNames: {
                  '#productId': 'productId',
                  '#quantity': 'quantity',
                  '#updatedAt': 'updatedAt',
                },
                ExpressionAttributeValues: {
                  ':quantity': quantity,
                  ':updatedAt': soldAt,
                },
              },
            },
            {
              Put: {
                TableName: this.salesTableName,
                Item: sale,
                ConditionExpression: 'attribute_not_exists(saleId)',
              },
            },
          ],
        }),
      );
    } catch (error) {
      if (error instanceof TransactionCanceledException) {
        const firstReason = error.CancellationReasons?.[0];
        if (firstReason?.Code === 'ConditionalCheckFailed') {
          if (product.quantity < quantity) {
            throw new InsufficientStockError();
          }
          throw new ProductNotFoundForSaleError();
        }
      }
      throw error;
    }

    return sale;
  }
}

export function createDynamoDbSaleRepository(): DynamoDbSaleRepository {
  const productsTableName = process.env.PRODUCTS_TABLE_NAME?.trim();
  const salesTableName = process.env.SALES_TABLE_NAME?.trim();
  if (!productsTableName || !salesTableName) {
    throw new Error(
      'PRODUCTS_TABLE_NAME and SALES_TABLE_NAME environment variables are required.',
    );
  }

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  });

  return new DynamoDbSaleRepository(client, productsTableName, salesTableName);
}
