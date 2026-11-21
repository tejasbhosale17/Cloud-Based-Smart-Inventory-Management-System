import { createDynamoDbSaleRepository } from '../sales/dynamodb-sale-repository.js';
import { createSaleHandler } from './sale-handlers.js';

export const createSale = createSaleHandler(createDynamoDbSaleRepository());
