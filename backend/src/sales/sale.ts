export interface Sale {
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  soldAt: string;
}

export class SaleInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaleInputError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface SaleInput {
  productId: string;
  quantity: number;
}

export function parseSaleInput(body: string | null | undefined): SaleInput {
  if (body === undefined || body === null || body.trim().length === 0) {
    throw new SaleInputError('Request body is required.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new SaleInputError('Request body must be valid JSON.');
  }

  if (!isRecord(payload)) {
    throw new SaleInputError('Request body must be a JSON object.');
  }

  const unexpectedFields = Object.keys(payload).filter(
    (field) => !['productId', 'quantity'].includes(field),
  );
  if (unexpectedFields.length > 0) {
    throw new SaleInputError(
      `Unexpected field: ${unexpectedFields.sort().join(', ')}.`,
    );
  }

  const productId = payload.productId;
  if (typeof productId !== 'string' || productId.trim().length === 0) {
    throw new SaleInputError('productId must be a non-empty string.');
  }

  const quantity = payload.quantity;
  if (
    typeof quantity !== 'number' ||
    !Number.isSafeInteger(quantity) ||
    quantity <= 0
  ) {
    throw new SaleInputError('quantity must be a positive integer.');
  }

  return { productId: productId.trim(), quantity };
}
