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
credentials/region supplied by the Lambda execution environment. The list handler
uses a paginated DynamoDB scan, suitable for this small coursework catalog;
scan read cost grows with table size. The dashboard does not poll the backend.

## AWS SAM API

[`template.yaml`](./template.yaml) defines the HTTP API, five route-specific
Lambda functions, and the DynamoDB product table. Each function receives only
the DynamoDB action it needs, scoped to that table. The table uses provisioned
throughput of 1 read capacity unit and 1 write capacity unit to keep the
development configuration predictable; confirm Free Tier eligibility and
regional pricing before deployment.

Build the Lambda bundles with `npm run sam:build`. To deploy interactively, run
`sam deploy --guided` and provide an allowed browser origin with the
`FrontendOrigin` parameter. The deployed API URL and table name are exposed as
CloudFormation outputs.

For local development, the API Gateway URL is configured for port 3000 in
[`samconfig.toml`](./samconfig.toml). Copy `env.local.example.json` to
`env.local.json` and update its table name to the deployed development table,
then run:

```powershell
sam local start-api --profile <aws-profile> --env-vars env.local.json
```

SAM local invokes the handlers on your machine, but DynamoDB requests still use
the configured AWS credentials and target the named AWS table. Use a dedicated
development stack and never put credentials in the environment file.
Copy `frontend/.env.example` to `frontend/.env.local` when the frontend API
client is introduced.

The HTTP API has no Cognito authorizer yet. Do not expose it publicly until
Phase 5 adds authentication.

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
