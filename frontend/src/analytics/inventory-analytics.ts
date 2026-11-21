import type { Product } from '../types/product';

export interface CategoryInventory {
  category: string;
  productCount: number;
  totalUnits: number;
  inventoryValue: number;
}

export interface InventoryAnalytics {
  productCount: number;
  totalUnits: number;
  lowStockCount: number;
  categoryCount: number;
  inventoryValue: number;
  categories: CategoryInventory[];
}

export function isProductLowStock(product: Product): boolean {
  return product.quantity <= product.lowStockThreshold;
}

export function calculateInventoryAnalytics(
  products: Product[],
): InventoryAnalytics {
  const categories = new Map<string, CategoryInventory>();
  let totalUnits = 0;
  let inventoryValue = 0;
  let lowStockCount = 0;

  for (const product of products) {
    totalUnits += product.quantity;
    inventoryValue += product.price * product.quantity;
    if (isProductLowStock(product)) {
      lowStockCount += 1;
    }

    const category = categories.get(product.category) ?? {
      category: product.category,
      productCount: 0,
      totalUnits: 0,
      inventoryValue: 0,
    };
    category.productCount += 1;
    category.totalUnits += product.quantity;
    category.inventoryValue += product.price * product.quantity;
    categories.set(product.category, category);
  }

  const categoryAnalytics = [...categories.values()].sort((left, right) =>
    left.category.localeCompare(right.category),
  );

  return {
    productCount: products.length,
    totalUnits,
    lowStockCount,
    categoryCount: categoryAnalytics.length,
    inventoryValue,
    categories: categoryAnalytics,
  };
}
