// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { calculateInventoryAnalytics } from './inventory-analytics';
import type { Product } from '../types/product';

const products: Product[] = [
  {
    productId: 'notebook',
    name: 'Classic Notebook',
    category: 'Stationery',
    price: 4.99,
    quantity: 120,
    lowStockThreshold: 25,
  },
  {
    productId: 'mouse',
    name: 'Wireless Mouse',
    category: 'Electronics',
    price: 24.5,
    quantity: 18,
    lowStockThreshold: 20,
  },
  {
    productId: 'cable',
    name: 'USB-C Cable',
    category: 'Electronics',
    price: 9.99,
    quantity: 7,
    lowStockThreshold: 15,
  },
];

describe('calculateInventoryAnalytics', () => {
  it('calculates totals, low-stock count, and sorted category summaries', () => {
    const analytics = calculateInventoryAnalytics(products);

    expect(analytics).toMatchObject({
      productCount: 3,
      totalUnits: 145,
      lowStockCount: 2,
      categoryCount: 2,
    });
    expect(analytics.inventoryValue).toBeCloseTo(1109.73, 2);
    expect(analytics.categories).toMatchObject([
      {
        category: 'Electronics',
        productCount: 2,
        totalUnits: 25,
      },
      {
        category: 'Stationery',
        productCount: 1,
        totalUnits: 120,
      },
    ]);
    expect(analytics.categories[0]?.inventoryValue).toBeCloseTo(510.93, 2);
    expect(analytics.categories[1]?.inventoryValue).toBeCloseTo(598.8, 2);
  });

  it('returns zeroed analytics for an empty inventory', () => {
    expect(calculateInventoryAnalytics([])).toEqual({
      productCount: 0,
      totalUnits: 0,
      lowStockCount: 0,
      categoryCount: 0,
      inventoryValue: 0,
      categories: [],
    });
  });
});
