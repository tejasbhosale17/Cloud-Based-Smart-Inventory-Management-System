import { createProductHandlers } from './product-handlers.js';
import { createDynamoDbProductRepository } from '../products/dynamodb-product-repository.js';

const handlers = createProductHandlers(createDynamoDbProductRepository());

export const createProduct = handlers.createProduct;
export const listProducts = handlers.listProducts;
export const getProduct = handlers.getProduct;
export const updateProduct = handlers.updateProduct;
export const deleteProduct = handlers.deleteProduct;
