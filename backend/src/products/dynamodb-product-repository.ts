import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { DuplicateProductError } from './product-repository.js';
import type { ProductRepository } from './product-repository.js';
import type { Product, ProductInput } from './product.js';

function decodeProduct(item: Record<string, unknown>): Product {
  const {
    productId,
    name,
    category,
    price,
    quantity,
    lowStockThreshold,
    createdAt,
    updatedAt,
  } = item;

  if (
    typeof productId !== 'string' ||
    typeof name !== 'string' ||
    typeof category !== 'string' ||
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price < 0 ||
    typeof quantity !== 'number' ||
    !Number.isSafeInteger(quantity) ||
    quantity < 0 ||
    typeof lowStockThreshold !== 'number' ||
    !Number.isSafeInteger(lowStockThreshold) ||
    lowStockThreshold < 0 ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    throw new Error('DynamoDB returned a product with an invalid schema.');
  }

  return {
    productId,
    name,
    category,
    price,
    quantity,
    lowStockThreshold,
    createdAt,
    updatedAt,
  };
}

function isConditionalCheckFailure(error: unknown): boolean {
  return error instanceof ConditionalCheckFailedException;
}

export class DynamoDbProductRepository implements ProductRepository {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async create(product: Product): Promise<void> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: product,
          ConditionExpression: 'attribute_not_exists(productId)',
        }),
      );
    } catch (error) {
      if (isConditionalCheckFailure(error)) {
        throw new DuplicateProductError();
      }
      throw error;
    }
  }

  async list(): Promise<Product[]> {
    const products: Product[] = [];
    let lastEvaluatedKey: ScanCommandInput['ExclusiveStartKey'];

    do {
      const response = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      );

      for (const item of response.Items ?? []) {
        products.push(decodeProduct(item));
      }
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return products;
  }

  async get(productId: string): Promise<Product | undefined> {
    const response = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { productId },
      }),
    );

    return response.Item ? decodeProduct(response.Item) : undefined;
  }

  async update(
    productId: string,
    input: ProductInput,
    updatedAt: string,
  ): Promise<Product | undefined> {
    try {
      const response = await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { productId },
          UpdateExpression:
            'SET #name = :name, #category = :category, #price = :price, #quantity = :quantity, #lowStockThreshold = :lowStockThreshold, #updatedAt = :updatedAt',
          ConditionExpression: 'attribute_exists(#productId)',
          ExpressionAttributeNames: {
            '#productId': 'productId',
            '#name': 'name',
            '#category': 'category',
            '#price': 'price',
            '#quantity': 'quantity',
            '#lowStockThreshold': 'lowStockThreshold',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':name': input.name,
            ':category': input.category,
            ':price': input.price,
            ':quantity': input.quantity,
            ':lowStockThreshold': input.lowStockThreshold,
            ':updatedAt': updatedAt,
          },
          ReturnValues: 'ALL_NEW',
        }),
      );

      return response.Attributes
        ? decodeProduct(response.Attributes)
        : undefined;
    } catch (error) {
      if (isConditionalCheckFailure(error)) {
        return undefined;
      }
      throw error;
    }
  }

  async delete(productId: string): Promise<boolean> {
    const response = await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { productId },
        ReturnValues: 'ALL_OLD',
      }),
    );

    return response.Attributes !== undefined;
  }
}

export function createDynamoDbProductRepository(): DynamoDbProductRepository {
  const tableName = process.env.PRODUCTS_TABLE_NAME?.trim();
  if (!tableName) {
    throw new Error('PRODUCTS_TABLE_NAME environment variable is required.');
  }

  const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  });

  return new DynamoDbProductRepository(client, tableName);
}
