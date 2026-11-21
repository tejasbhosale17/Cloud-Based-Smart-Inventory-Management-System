# Cloud-Based Smart Inventory Management System

An academic cloud computing project for managing products, inventory, and sales
with a React and TypeScript frontend and AWS serverless backend.

## Project structure

- `frontend/` - React, TypeScript, and Vite application.
- `backend/` - TypeScript AWS Lambda handlers.
- AWS infrastructure and service integrations will be added in their planned
  project phases.

## Inventory dashboard

The inventory dashboard loads products from the protected API and shows inventory
summary cards, product search, category and low-stock filters, and loading,
empty, and error states. Employees sign in through Amazon Cognito Managed Login.
The browser uses the OIDC authorization-code flow with PKCE; the API client sends
the access token as a bearer token.

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
Lambda functions, the DynamoDB product table, an employee Cognito user pool,
and a public Cognito app client/domain. API Gateway validates Cognito access
tokens with a JWT authorizer. Each function receives only the DynamoDB action it
needs, scoped to that table. The table uses provisioned throughput of 1 read
capacity unit and 1 write capacity unit to keep the development configuration
predictable; confirm Free Tier eligibility and regional pricing before
deployment.

Build the Lambda bundles with `npm run sam:build`. To deploy interactively, run
`sam deploy --guided`, provide an allowed browser origin with the
`FrontendOrigin` parameter, and provide a `CognitoDomainPrefix` unique within
the deployment region. The deployed API URL, table name, Cognito issuer, app
client ID, and managed-login domain are exposed as CloudFormation outputs.

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
Use a deployed development API to verify API Gateway's JWT authorization
end-to-end; local Lambda invocation does not replace that verification.
Copy `frontend/.env.example` to `frontend/.env.local`, then fill in the API URL
and Cognito values from the stack outputs. For local sign-in, set
`FrontendOrigin` to `http://localhost:5173`; the frontend defaults its callback
and logout URLs to the current browser origin.

The Cognito callback and logout URLs must exactly match `FrontendOrigin`.
Production callbacks require HTTPS. The S3 static website endpoint is HTTP-only,
so configure an HTTPS frontend origin (for example, through CloudFront) before
using Cognito authentication in production. No CloudFront distribution or AWS
resources are created by this project phase.

The user pool allows employee self-registration with verified email and
password sign-in. The app client has no client secret and only enables the
authorization-code flow. Access tokens last 60 minutes; expired or revoked
tokens cause the frontend to clear its session and return to sign-in. No SMS or
low-stock notification service is configured in this phase.

## Sales workflow

`POST /sales` accepts a `productId` and positive integer `quantity`. The Lambda
reads the current product price, then uses a DynamoDB transaction to decrement
inventory and store a sale record in the separate sales table. The transaction
condition prevents negative inventory; insufficient stock returns `409`, a
missing product returns `404`, and invalid input returns `400`. Because the
inventory update and sale record are in one transaction, neither is committed
without the other.

The dashboard includes an authenticated sale form. A successful sale updates the
displayed quantity without polling. The sales table uses one provisioned read
and write capacity unit for the coursework configuration; confirm regional
pricing and Free Tier eligibility before deployment.

## Local development

Requirements: Node.js 20 or newer and npm.

```powershell
npm install
npm run dev --workspace frontend
```

The frontend requires the public API and Cognito settings described above. These
are configuration values, not credentials; do not commit `.env.local` files.

## Quality checks

Run these from the repository root:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
```

## Configuration and security

Do not commit `.env` files, AWS credentials, or other secrets. Cognito's public
app client ID and issuer/domain are not secrets, but keep per-environment
settings in ignored local environment files. Lambda AWS access uses its
execution role; do not add static AWS credentials to the application.

## Project progress

See [PROGRESS.md](./PROGRESS.md) for phase status.
