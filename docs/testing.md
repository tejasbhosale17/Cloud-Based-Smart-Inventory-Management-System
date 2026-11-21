# Testing and Validation

Run commands from the repository root with Node.js 20 or newer and npm.

## Automated checks

```powershell
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build --workspace frontend
npm audit
```

`npm run typecheck` checks the frontend and backend TypeScript projects. `npm test` runs the Vitest suite, including frontend component/API/auth tests, product and sales handlers and DynamoDB repositories, low-stock notification behavior, SNS publishing, and structured logging.

## Infrastructure and bundle checks

With the AWS SAM CLI installed:

```powershell
sam validate --lint --template-file template.yaml
npm run sam:build
```

SAM validation checks the transformed template; `sam build` bundles the Lambda entrypoint with esbuild. Neither command deploys resources. The template includes CloudFront/S3 hosting, Cognito callback and logout URLs, CORS origins, scoped IAM statements, conditional SNS resources, and seven-day log retention.

If SAM CLI is unavailable, the YAML can still be parsed and key resource relationships checked locally, but that is not a substitute for `sam validate` or an AWS deployment review. Review the final change set in the AWS console before any deployment.

## Manual deployment smoke checks

After separate deployment approval and a successful deployment:

1. Load `FrontendUrl` over HTTPS and complete Cognito registration/sign-in.
2. Verify unauthenticated API requests are rejected and authenticated requests succeed.
3. Create, view, update, and delete a product; verify search and dashboard states.
4. Record a valid sale and confirm quantity decreases once. Try insufficient stock and confirm `409` with no negative quantity.
5. If notifications were enabled, confirm the SNS email subscription and cross a low-stock threshold.
6. Review API access logs and Lambda error records in CloudWatch; confirm records do not include request bodies or tokens.

No AWS deployment or frontend upload is part of the Phase 10 preparation.
