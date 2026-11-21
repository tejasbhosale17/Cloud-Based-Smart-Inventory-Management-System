# Presentation Notes

## Suggested 5-7 minute outline

1. **Problem and goal** - Explain the inventory tracking problem and the need to prevent overselling.
2. **Architecture** - Show the architecture diagram. A React/TypeScript SPA is delivered over HTTPS from CloudFront and a private S3 bucket. API Gateway validates Cognito access tokens before routing requests to Lambda.
3. **Data and business rules** - Products and sales are separate DynamoDB tables. A sale uses one conditional DynamoDB transaction so inventory and the sale record commit together.
4. **Analytics and alerts** - Explain low-stock/category dashboard summaries. Optional SNS email alerts are driven by DynamoDB Streams, not polling.
5. **Security and operations** - Describe Cognito JWT authorization, scoped Lambda permissions, private S3 access via CloudFront OAC, structured logs, and seven-day retention.
6. **Cost choices** - Point out small provisioned DynamoDB capacity, 128 MB ARM64 Lambda functions, optional notifications, and the CloudFront/logging cost drivers.
7. **Quality evidence** - Show the automated test suite and type/lint/build checks. Do not claim AWS deployment until it has actually been approved and completed.

## Key points to emphasize

- Cognito access tokens protect every API route; no static AWS credentials are embedded in the frontend.
- Sales prevent negative stock and use a transaction to avoid partial persistence.
- Low-stock notifications are optional; configuring an email creates stream/SNS resources and requires subscription confirmation.
- Static assets are private in S3. CloudFront provides HTTPS for hosted Cognito redirects.
- This is a coursework-scale configuration, not a production security or availability certification.

## Questions to anticipate

- **Why CloudFront?** S3 website endpoints are HTTP-only. Cognito hosted login requires HTTPS callback URLs outside localhost; CloudFront serves the private S3 origin over HTTPS.
- **Why DynamoDB transactions?** The quantity decrement and sale item must succeed or fail together.
- **How are alerts triggered?** DynamoDB Streams emits changes and the handler sends only on low-stock threshold transitions.
- **What keeps costs down?** Small provisioned capacity, low Lambda memory/timeout, optional SNS, seven-day log retention, and no polling or NAT Gateway.
- **What remains to operate?** Deployment approval, region/domain-prefix selection, frontend upload, Cognito signup policy review, and live AWS cost monitoring.
