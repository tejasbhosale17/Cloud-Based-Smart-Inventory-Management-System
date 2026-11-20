export interface ProductInput {
  name: string;
  category: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
}

export interface Product extends ProductInput {
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export class ProductInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductInputError';
  }
}

const productFields = new Set([
  'name',
  'category',
  'price',
  'quantity',
  'lowStockThreshold',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTextField(
  input: Record<string, unknown>,
  field: 'name' | 'category',
): string {
  const value = input[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ProductInputError(`${field} must be a non-empty string.`);
  }

  const normalizedValue = value.trim();
  if (normalizedValue.length > 100) {
    throw new ProductInputError(`${field} must be 100 characters or fewer.`);
  }

  return normalizedValue;
}

function readNonNegativeNumber(
  input: Record<string, unknown>,
  field: 'price' | 'quantity' | 'lowStockThreshold',
  integer: boolean,
): number {
  const value = input[field];

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    (integer && !Number.isSafeInteger(value))
  ) {
    const requirement = integer
      ? 'a non-negative integer'
      : 'a non-negative number';
    throw new ProductInputError(`${field} must be ${requirement}.`);
  }

  return value;
}

export function parseProductInput(
  body: string | null | undefined,
): ProductInput {
  if (body === undefined || body === null || body.trim().length === 0) {
    throw new ProductInputError('Request body is required.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new ProductInputError('Request body must be valid JSON.');
  }

  if (!isRecord(payload)) {
    throw new ProductInputError('Request body must be a JSON object.');
  }

  const unexpectedFields = Object.keys(payload).filter(
    (field) => !productFields.has(field),
  );
  if (unexpectedFields.length > 0) {
    throw new ProductInputError(
      `Unexpected field: ${unexpectedFields.sort().join(', ')}.`,
    );
  }

  return {
    name: readTextField(payload, 'name'),
    category: readTextField(payload, 'category'),
    price: readNonNegativeNumber(payload, 'price', false),
    quantity: readNonNegativeNumber(payload, 'quantity', true),
    lowStockThreshold: readNonNegativeNumber(
      payload,
      'lowStockThreshold',
      true,
    ),
  };
}
