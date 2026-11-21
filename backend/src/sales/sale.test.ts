// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { parseSaleInput } from './sale.js';

describe('parseSaleInput', () => {
  it('trims product IDs and accepts a positive integer quantity', () => {
    expect(
      parseSaleInput(JSON.stringify({ productId: ' product-1 ', quantity: 3 })),
    ).toEqual({ productId: 'product-1', quantity: 3 });
  });

  it('rejects zero, negative, fractional, and unsafe quantities', () => {
    for (const quantity of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        parseSaleInput(JSON.stringify({ productId: 'product-1', quantity })),
      ).toThrow('quantity must be a positive integer');
    }
  });
});
