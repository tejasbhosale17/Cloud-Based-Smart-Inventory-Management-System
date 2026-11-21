# Deployment Preparation

This guide describes a future deployment. It was not executed during Phase 10 preparation. Do not run deployment commands until deployment has been separately approved.

## Configuration audit

| Setting                | Current behavior                                                           | Deployment action                                                                   |
| ---------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `CognitoDomainPrefix`  | Required; no default; lowercase DNS-like value with a maximum length of 63 | Choose a prefix unique in the selected region                                       |
| `FrontendOrigin`       | Defaults to `http://localhost:5173`                                        | Keep for local development; the CloudFront HTTPS origin is also added automatically |
| `StageName`            | Defaults to `dev`                                                          | Keep `dev` for the coursework stack                                                 |
| `LowStockEmailAddress` | Optional and empty by default                                              | Omit to avoid SNS/stream resources; if supplied, confirm the SNS email subscription |
| AWS region             | Not pinned in `samconfig.toml` or the template                             | Select explicitly with `--region`; the stack uses `AWS::Region`                     |
| Deployment stack       | `cloud-smart-inventory-dev` in `samconfig.toml`                            | Use a separate stack name for another environment                                   |

## Audit findings and dispositions

| Area                                | Finding                                                                                                                                | Preparation change                                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Required parameters and region      | Cognito prefix was required; no AWS region was pinned                                                                                  | Documented the required prefix and explicit `--region`; kept the region account-selected                                               |
| Cognito callback/logout             | The original URLs included only `FrontendOrigin`                                                                                       | Added the CloudFront HTTPS origin while retaining localhost for local development                                                      |
| API Gateway CORS and JWT authorizer | The original API lacked an inline OpenAPI body required by SAM to apply CORS and authorizer settings; only the local origin was listed | Added an inline OpenAPI body, the generated CloudFront HTTPS origin, and the local origin; retained the Cognito JWT default authorizer |
| S3 hosting                          | No frontend bucket or HTTPS distribution existed                                                                                       | Added private S3, CloudFront OAC, HTTPS redirect, SPA fallback, and hosting outputs                                                    |
| SNS email                           | Email subscription was optional and topic/stream were conditional                                                                      | Preserved the default-disabled email configuration and confirmation requirement                                                        |
| IAM permissions                     | Data actions were scoped to their tables; notifier publish was scoped to its topic                                                     | Preserved those limits; the S3 read policy is scoped to the CloudFront distribution                                                    |
| CloudWatch retention                | API and Lambda logs retained for seven days                                                                                            | Preserved seven-day expiration                                                                                                         |
| Cost risks                          | Frontend CDN, logs, DynamoDB, optional SNS, and SAM artifacts can incur charges                                                        | Documented drivers and low-volume controls; deployment remains unperformed                                                             |
| Stack outputs                       | Frontend URL/bucket/distribution and region were missing                                                                               | Added those outputs and a Cognito user-pool ID output                                                                                  |

The frontend bucket is private and blocks public access. CloudFront uses Origin
Access Control, and the S3 bucket policy grants only `s3:GetObject` to that
distribution. CloudFront enforces HTTPS, provides the HTTPS Cognito callback,
and serves the SPA fallback. The generated CloudFront origin and configured
local origin are included in API CORS and Cognito callback/logout URLs.

The Cognito user pool permits self-registration and has MFA disabled for the
coursework flow. Review those settings before using the stack beyond a
controlled demonstration.

The HTTP API has a Cognito JWT default authorizer. Product functions have only their required product-table actions; the sale function has `GetItem` and `TransactWriteItems` scoped to the product and sales table ARNs. The optional notifier can publish only to the low-stock SNS topic. SAM creates the stream read permissions for its event mapping. API and Lambda log groups have seven-day retention.

## Prerequisites

- Node.js 20 or newer and npm.
- AWS CLI configured with a named profile or other approved credentials; do not place static keys in files or commands.
- AWS SAM CLI.
- An AWS account and a chosen deployment region.

Run the repository checks before deployment:

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

## Backend and infrastructure

Copy the ignored local SAM configuration so guided parameters, including an optional recipient email, are not saved to the tracked configuration:

```powershell
Copy-Item .\samconfig.toml .\samconfig.local.toml
npm run sam:build
sam deploy --guided --region <aws-region> --config-file .\samconfig.local.toml
```

Replace `<aws-region>` with the selected region. During the guided prompt, set a unique `CognitoDomainPrefix`. `FrontendOrigin` defaults to localhost for local development. Leave `LowStockEmailAddress` empty to keep SNS disabled. If you enter an address, confirm its SNS subscription email. Keep `samconfig.local.toml` uncommitted; it is ignored by Git.

The first deployment provisions the backend, private frontend bucket, CloudFront distribution, and Cognito/API configuration. CloudFront distribution deployment can take several minutes. Review the change set, selected region, and AWS pricing before confirming. The `samconfig.toml` setting `resolve_s3 = true` lets SAM manage a separate deployment-artifact bucket; review that bucket and its contents when cleaning up.

After deployment, inspect the stack outputs:

```powershell
aws cloudformation describe-stacks `
  --stack-name cloud-smart-inventory-dev `
  --region <aws-region> `
  --query "Stacks[0].Outputs[].{Key:OutputKey,Value:OutputValue}" `
  --output table
```

Use the outputs as follows:

| Output                                | Use                                                          |
| ------------------------------------- | ------------------------------------------------------------ |
| `ApiBaseUrl`                          | `VITE_API_BASE_URL`                                          |
| `FrontendUrl`                         | Cognito redirect/logout URI and browser URL                  |
| `FrontendBucketName`                  | Target for the built frontend assets                         |
| `FrontendDistributionId`              | CloudFront invalidations after uploads                       |
| `CognitoAuthority`                    | `VITE_COGNITO_AUTHORITY`                                     |
| `CognitoClientId`                     | `VITE_COGNITO_CLIENT_ID`                                     |
| `CognitoDomain`                       | `VITE_COGNITO_DOMAIN`                                        |
| `CognitoUserPoolId`                   | User-pool administration and deployment verification         |
| `DeploymentRegion`                    | AWS CLI region for stack and bucket operations               |
| `ProductsTableName`, `SalesTableName` | Backend table verification and local API configuration       |
| `LowStockTopicArn`                    | Available only when optional email notifications are enabled |

## Build and upload the frontend

Set the frontend build-time configuration from the deployed outputs. These are public client settings, not AWS credentials. Use the CloudFront URL for redirect and logout; it is automatically registered in Cognito.

```powershell
$env:VITE_API_BASE_URL = "<ApiBaseUrl>"
$env:VITE_COGNITO_AUTHORITY = "<CognitoAuthority>"
$env:VITE_COGNITO_CLIENT_ID = "<CognitoClientId>"
$env:VITE_COGNITO_DOMAIN = "<CognitoDomain>"
$env:VITE_COGNITO_REDIRECT_URI = "<FrontendUrl>"
$env:VITE_COGNITO_LOGOUT_URI = "<FrontendUrl>"

npm run build --workspace frontend
aws s3 sync .\frontend\dist "s3://<FrontendBucketName>" --delete --region <aws-region>
aws cloudfront create-invalidation --distribution-id <FrontendDistributionId> --paths "/*"
```

Replace each placeholder with its matching stack output before running these commands. The `--delete` option is scoped to the frontend bucket and removes old frontend objects; do not point it at another bucket. These commands were not run during Phase 10 preparation.

## Deployment outputs

The template outputs the selected region, API URL, HTTPS frontend URL, private bucket name, CloudFront distribution ID, table names, Cognito issuer/pool/client/domain, and the optional SNS topic ARN when notifications are enabled.

Before removing a development stack, export any inventory data that must be retained. CloudFormation does not empty an S3 bucket automatically; remove only the frontend objects in the project bucket after confirming its name. The SAM-managed deployment artifact bucket is separate and may remain after stack removal.
