import type { Sale } from './sale.js';

export class ProductNotFoundForSaleError extends Error {
  constructor() {
    super('Product not found.');
    this.name = 'ProductNotFoundForSaleError';
  }
}

export class InsufficientStockError extends Error {
  constructor() {
    super('Insufficient stock for this sale.');
    this.name = 'InsufficientStockError';
  }
}

export interface SaleRepository {
  createSale(
    productId: string,
    quantity: number,
    saleId: string,
    soldAt: string,
  ): Promise<Sale>;
}
