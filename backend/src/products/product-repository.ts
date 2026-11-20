import type { Product, ProductInput } from './product.js';

export interface ProductRepository {
  create(product: Product): Promise<void>;
  list(): Promise<Product[]>;
  get(productId: string): Promise<Product | undefined>;
  update(
    productId: string,
    input: ProductInput,
    updatedAt: string,
  ): Promise<Product | undefined>;
  delete(productId: string): Promise<boolean>;
}

export class DuplicateProductError extends Error {
  constructor() {
    super('A product with this ID already exists.');
    this.name = 'DuplicateProductError';
  }
}
