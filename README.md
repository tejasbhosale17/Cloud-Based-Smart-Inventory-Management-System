# Cloud-Based Smart Inventory Management System

An academic cloud computing project for managing products, inventory, and sales
with a React and TypeScript frontend and AWS serverless backend.

## Project structure

- `frontend/` - React, TypeScript, and Vite application.
- `backend/` - TypeScript AWS Lambda handlers.
- AWS infrastructure and service integrations will be added in their planned
  project phases.

## Inventory dashboard

The current dashboard uses local mock products. It provides inventory summary
cards, product search, category and low-stock filters, and loading, empty, and
error states. Product changes and API integration are planned for later phases.

## Product API handlers

The backend exports Lambda handlers for product creation, listing, retrieval,
replacement, and deletion. They use a DynamoDB table with `productId` as its
partition key and the following product attributes: `name`, `category`, `price`,
`quantity`, `lowStockThreshold`, `createdAt`, and `updatedAt`.

| Method | Route                   | Handler         |
| ------ | ----------------------- | --------------- |
| POST   | `/products`             | `createProduct` |
| GET    | `/products`             | `listProducts`  |
| GET    | `/products/{productId}` | `getProduct`    |
| PUT    | `/products/{productId}` | `updateProduct` |
| DELETE | `/products/{productId}` | `deleteProduct` |

The handlers expect the `PRODUCTS_TABLE_NAME` environment variable and AWS
credentials/region supplied by the Lambda execution environment. They do not
include API Gateway or DynamoDB deployment resources; those are added in Phase 4.
The list handler uses a paginated DynamoDB scan, suitable for this small
coursework catalog; scan read cost grows with table size. The dashboard does not
poll the backend.

## Local development

Requirements: Node.js 20 or newer and npm.

```powershell
npm install
npm run dev --workspace frontend
```

AWS deployment configuration will be introduced in a later phase.

## Quality checks

Run these from the repository root:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
```

## Configuration and security

Do not commit `.env` files, AWS credentials, or other secrets. Use environment
variables and AWS-managed identity/configuration for future integrations.

## Project progress

See [PROGRESS.md](./PROGRESS.md) for phase status.
