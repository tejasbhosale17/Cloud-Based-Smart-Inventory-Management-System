import { randomUUID } from 'node:crypto';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { DuplicateProductError } from '../products/product-repository.js';
import type { ProductRepository } from '../products/product-repository.js';
import { parseProductInput, ProductInputError } from '../products/product.js';
import { logError } from '../observability/structured-logger.js';

type ProductLambdaHandler = (
  event: APIGatewayProxyEventV2,
) => Promise<APIGatewayProxyStructuredResultV2>;

interface ProductHandlers {
  createProduct: ProductLambdaHandler;
  listProducts: ProductLambdaHandler;
  getProduct: ProductLambdaHandler;
  updateProduct: ProductLambdaHandler;
  deleteProduct: ProductLambdaHandler;
}

function jsonResponse(
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

function errorResponse(
  operation: keyof ProductHandlers,
  event: APIGatewayProxyEventV2,
  error: unknown,
): APIGatewayProxyStructuredResultV2 {
  if (error instanceof ProductInputError) {
    return jsonResponse(400, { message: error.message });
  }

  if (error instanceof DuplicateProductError) {
    return jsonResponse(409, { message: 'Product already exists.' });
  }

  logError('Product operation failed.', error, {
    operation,
    requestId: event.requestContext.requestId,
  });
  return jsonResponse(500, { message: 'Internal server error.' });
}

function withErrorHandling(
  operation: keyof ProductHandlers,
  handler: (
    event: APIGatewayProxyEventV2,
  ) => Promise<APIGatewayProxyStructuredResultV2>,
): ProductLambdaHandler {
  return async (event) => {
    try {
      return await handler(event);
    } catch (error) {
      return errorResponse(operation, event, error);
    }
  };
}

function readProductId(event: APIGatewayProxyEventV2): string {
  const productId = event.pathParameters?.productId?.trim();
  if (!productId) {
    throw new ProductInputError('Product ID is required.');
  }
  return productId;
}

function readBody(event: APIGatewayProxyEventV2): string | undefined {
  if (event.body === undefined || !event.isBase64Encoded) {
    return event.body;
  }

  return Buffer.from(event.body, 'base64').toString('utf8');
}

export function createProductHandlers(
  repository: ProductRepository,
): ProductHandlers {
  return {
    createProduct: withErrorHandling('createProduct', async (event) => {
      const input = parseProductInput(readBody(event));
      const now = new Date().toISOString();
      const product = {
        ...input,
        productId: randomUUID(),
        createdAt: now,
        updatedAt: now,
      };

      await repository.create(product);
      return jsonResponse(
        201,
        { product },
        { location: `/products/${product.productId}` },
      );
    }),

    listProducts: withErrorHandling('listProducts', async () => {
      const products = await repository.list();
      return jsonResponse(200, { products });
    }),

    getProduct: withErrorHandling('getProduct', async (event) => {
      const productId = readProductId(event);
      const product = await repository.get(productId);
      if (!product) {
        return jsonResponse(404, { message: 'Product not found.' });
      }
      return jsonResponse(200, { product });
    }),

    updateProduct: withErrorHandling('updateProduct', async (event) => {
      const productId = readProductId(event);
      const input = parseProductInput(readBody(event));
      const product = await repository.update(
        productId,
        input,
        new Date().toISOString(),
      );
      if (!product) {
        return jsonResponse(404, { message: 'Product not found.' });
      }
      return jsonResponse(200, { product });
    }),

    deleteProduct: withErrorHandling('deleteProduct', async (event) => {
      const productId = readProductId(event);
      const deleted = await repository.delete(productId);
      if (!deleted) {
        return jsonResponse(404, { message: 'Product not found.' });
      }
      return { statusCode: 204 };
    }),
  };
}
