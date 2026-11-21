# Cloud-Based Smart Inventory Management System

An academic cloud computing project for managing products, inventory, and sales
with a React and TypeScript frontend and AWS serverless backend.

## Project structure

- `frontend/` - React, TypeScript, and Vite application.
- `backend/` - TypeScript AWS Lambda handlers.
- `template.yaml` - AWS SAM infrastructure for the API, data, auth, hosting, and
  optional notifications.
- `docs/` - Deployment, API, testing, cost, presentation, and demo documentation.

## Inventory dashboard

The inventory dashboard loads products from the protected API and shows inventory
summary cards, product search, category and low-stock filters, and loading,
empty, and error states. Employees sign in through Amazon Cognito Managed Login.
The browser uses the OIDC authorization-code flow with PKCE; the API client sends
the access token as a bearer token.

Inventory analytics include current stock value (unit price multiplied by
on-hand quantity), low-stock and category summaries, and a Chart.js bar chart of
units by category. Analytics recalculate when products are loaded or a sale
updates stock; the dashboard does not poll the API.

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

## Deployment and frontend hosting

[`template.yaml`](./template.yaml) defines the authenticated HTTP API, six
route-specific API Lambda functions, DynamoDB product and sales tables, Cognito,
optional low-stock SNS email notifications, CloudWatch logs, and frontend
hosting. The frontend is a Vite static build in a private S3 bucket. CloudFront
uses Origin Access Control to read the bucket and serves it over HTTPS; the
bucket is not public and does not use the HTTP-only S3 website endpoint.

The template's configuration parameters are:

| Parameter              | Default                 | Purpose                                                                            |
| ---------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| `CognitoDomainPrefix`  | Required                | Unique lowercase Cognito domain prefix in the selected region                      |
| `FrontendOrigin`       | `http://localhost:5173` | Local development origin; the CloudFront HTTPS origin is added automatically       |
| `StageName`            | `dev`                   | API Gateway stage                                                                  |
| `LowStockEmailAddress` | Empty                   | Optional SNS email recipient; empty disables the stream and notification resources |
| AWS region             | Not pinned              | Select explicitly when deploying with `--region`                                   |

`samconfig.toml` provides the development stack name and safe deploy defaults.
Copy it to the ignored `samconfig.local.toml` before guided deployment so local
parameter values are not committed. These commands are preparation instructions
only; no AWS resources have been created or deployed:

```powershell
Copy-Item .\samconfig.toml .\samconfig.local.toml
npm run sam:build
sam deploy --guided --region <aws-region> --config-file .\samconfig.local.toml
```

Review the change set, AWS region, parameters, and current service pricing before
confirming a deployment. Leave `LowStockEmailAddress` empty unless email alerts
are being demonstrated. If configured, confirm the subscription email sent by
SNS. See [docs/deployment.md](./docs/deployment.md) for all parameters, outputs,
and future frontend publication steps.

After an approved deployment, obtain stack outputs and use `ApiBaseUrl`,
`CognitoAuthority`, `CognitoClientId`, `CognitoDomain`, and `FrontendUrl` as the
frontend's build-time settings. Then build `frontend/`, sync its `dist/` folder
to the output `FrontendBucketName`, and invalidate the output
`FrontendDistributionId`. This project does not upload or deploy the frontend
during preparation.

For local development, `samconfig.toml` configures the API on port 3000. Copy
[`env.local.example.json`](./env.local.example.json) to `env.local.json` and set
the development table name, then run:

```powershell
sam local start-api --profile <aws-profile> --env-vars env.local.json
```

SAM local invokes handlers on your machine, but DynamoDB requests still use the
configured AWS credentials and target the named AWS table. Never place
credentials in the environment file. Copy [`frontend/.env.example`](./frontend/.env.example)
to `frontend/.env.local` for local browser development. Local HTTP is allowed
only for localhost; hosted Cognito callbacks use the CloudFront HTTPS URL.

The user pool allows employee self-registration with verified email and
password sign-in. The app client has no client secret and only enables the
authorization-code flow. Access tokens last 60 minutes; expired or revoked
tokens cause the frontend to clear its session and return to sign-in.

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

## Low-stock email notifications

The products DynamoDB stream invokes a Lambda when product data changes. It
publishes an SNS email alert when a product is created at/below its low-stock
threshold or transitions from healthy stock to low stock. Continuing sales
while the product remains low do not generate repeated alerts; a restock followed
by a new threshold crossing can generate another alert. This is event-driven and
does not poll the table.

Set the optional `LowStockEmailAddress` deployment parameter to create an email
subscription and confirm it using the message SNS sends. Alerts are not delivered
until the subscription is confirmed. Leave the parameter empty to disable email
delivery; the notification topic, worker, subscription, and product-table stream
are conditionally enabled only when an email address is provided. Only SNS email
subscriptions are configured; SMS is not implemented.
Notification failures are retried by the stream event source mapping and do not
roll back an already committed inventory update or sale.

## CloudWatch monitoring and cost controls

The SAM template enables JSON Lambda logs and API Gateway HTTP API access logs.
Lambda log groups and the API access log group retain events for 7 days. API
access records contain the request ID, route key, response status, and response
size; they do not capture request bodies or authorization headers. Application
error records include the operation and request or stream event ID, plus the
error type, but exclude raw exception messages and request data.

Use CloudWatch Logs Insights to find recent structured application errors:

```text
fields @timestamp, @message
| filter @message like /"level":"ERROR"/
| sort @timestamp desc
| limit 20
```

For health checks, review Lambda `Errors`, `Throttles`, `Duration`, and
`Invocations`; API Gateway `4xx`, `5xx`, `Count`, and `Latency`; and DynamoDB
throttling and consumed-capacity metrics. When email notifications are enabled,
also check the notification Lambda's errors and `IteratorAge`. The project does
not enable route-level detailed metrics or create CloudWatch alarms or
dashboards, which can add recurring charges.

Cost controls include 128 MB Lambda functions with a 5-second timeout and ARM64
architecture, DynamoDB provisioned at 1 read and 1 write capacity unit per
table, seven-day log retention, a `PriceClass_100` CloudFront distribution, and
optional SNS notifications. The product stream, notification worker, topic, and
email subscription are omitted when `LowStockEmailAddress` is empty. The
dashboard does not poll, and no EC2, RDS, NAT Gateway, X-Ray tracing, or SMS
resources are configured. CloudFront, S3, API access logs, and the SAM artifact
bucket can still incur charges. AWS Free Tier eligibility and pricing vary by
account, region, and usage; review current charges before deployment. Export
any data that must be kept before deleting a development stack.

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
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build --workspace frontend
npm audit
npm run sam:build
```

With AWS SAM CLI installed, also run `sam validate --lint --template-file
template.yaml`. See [docs/testing.md](./docs/testing.md) for what each check
covers and post-deployment smoke checks.

## Configuration and security

Do not commit `.env` files, AWS credentials, or other secrets. Cognito's public
app client ID and issuer/domain are not secrets, but keep per-environment
settings in ignored local environment files. Keep `samconfig.local.toml`
uncommitted, especially when it contains an optional notification recipient.
Lambda AWS access uses its execution role; do not add static AWS credentials
to the application. The S3 bucket blocks public access and grants object reads
only to its CloudFront distribution.

## Project documentation

- [Architecture diagrams](./.github/modernize/assessment/engines/facts/architecture-diagram.md)
- [API reference](./docs/api.md)
- [Deployment guide](./docs/deployment.md)
- [Testing and validation](./docs/testing.md)
- [AWS cost controls](./docs/cost-controls.md)
- [Presentation notes](./docs/presentation-notes.md)
- [Demonstration script](./docs/demo-script.md)

## Project progress

See [PROGRESS.md](./PROGRESS.md) for phase status.
