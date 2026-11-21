import { randomUUID } from 'node:crypto';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import {
  InsufficientStockError,
  ProductNotFoundForSaleError,
} from '../sales/sale-repository.js';
import type { SaleRepository } from '../sales/sale-repository.js';
import { parseSaleInput, SaleInputError } from '../sales/sale.js';

type SaleLambdaHandler = (
  event: APIGatewayProxyEventV2,
) => Promise<APIGatewayProxyStructuredResultV2>;

function jsonResponse(
  statusCode: number,
  body: unknown,
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function readBody(event: APIGatewayProxyEventV2): string | undefined {
  if (event.body === undefined || !event.isBase64Encoded) {
    return event.body;
  }

  return Buffer.from(event.body, 'base64').toString('utf8');
}

export function createSaleHandler(
  repository: SaleRepository,
): SaleLambdaHandler {
  return async (event) => {
    try {
      const input = parseSaleInput(readBody(event));
      const soldAt = new Date().toISOString();
      const sale = await repository.createSale(
        input.productId,
        input.quantity,
        randomUUID(),
        soldAt,
      );

      return jsonResponse(201, { sale });
    } catch (error) {
      if (error instanceof SaleInputError) {
        return jsonResponse(400, { message: error.message });
      }
      if (error instanceof ProductNotFoundForSaleError) {
        return jsonResponse(404, { message: 'Product not found.' });
      }
      if (error instanceof InsufficientStockError) {
        return jsonResponse(409, { message: error.message });
      }

      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Sale creation failed.',
          requestId: event.requestContext.requestId,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        }),
      );
      return jsonResponse(500, { message: 'Internal server error.' });
    }
  };
}
