import type { Product } from '../types/product';

const mockProducts: Product[] = [
  {
    productId: 'product-1001',
    name: 'Classic Notebook',
    category: 'Stationery',
    price: 4.99,
    quantity: 120,
    lowStockThreshold: 25,
  },
  {
    productId: 'product-1002',
    name: 'Wireless Mouse',
    category: 'Electronics',
    price: 24.5,
    quantity: 18,
    lowStockThreshold: 20,
  },
  {
    productId: 'product-1003',
    name: 'Ceramic Mug',
    category: 'Kitchen',
    price: 12,
    quantity: 42,
    lowStockThreshold: 12,
  },
  {
    productId: 'product-1004',
    name: 'USB-C Cable',
    category: 'Electronics',
    price: 9.99,
    quantity: 7,
    lowStockThreshold: 15,
  },
  {
    productId: 'product-1005',
    name: 'Desk Organizer',
    category: 'Office',
    price: 18.75,
    quantity: 25,
    lowStockThreshold: 10,
  },
  {
    productId: 'product-1006',
    name: 'Water Bottle',
    category: 'Accessories',
    price: 16,
    quantity: 11,
    lowStockThreshold: 15,
  },
];

export async function getMockProducts(): Promise<Product[]> {
  return mockProducts.map((product) => ({ ...product }));
}
