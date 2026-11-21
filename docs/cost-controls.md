# AWS Cost Controls

This project is designed for low-volume coursework use, not as a price guarantee. AWS Free Tier eligibility, service offers, and prices depend on account age, region, date, and usage. Review current AWS pricing and billing before deployment.

## Configured controls

- DynamoDB products and sales tables use provisioned capacity of 1 read and 1 write capacity unit each. This limits baseline capacity but can throttle larger workloads; scans and transactions consume capacity.
- Lambda functions use ARM64, 128 MB memory, and a 5-second timeout.
- SNS, the product-table stream, and the notification worker are conditional on `LowStockEmailAddress`; leaving it empty disables them.
- Lambda and API access log groups expire events after seven days. API logs contain only request ID, route, status, and response size.
- CloudFront uses `PriceClass_100`, compresses static assets, and has a five-minute default cache TTL with a 24-hour maximum. S3 public access is blocked.
- The project does not configure EC2, RDS, NAT Gateway, OpenSearch, SMS, X-Ray tracing, detailed route metrics, CloudWatch alarms, or dashboards.
- DynamoDB point-in-time recovery is not enabled. Export required data before stack deletion; add a separately priced backup policy before storing valuable data.

## Cost drivers to review

| Service     | Potential charge driver                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| CloudFront  | Distribution requests and data transfer; cost may continue during idle periods depending on current pricing        |
| S3          | Frontend object storage, uploads, downloads, and the separate SAM deployment-artifact bucket                       |
| API Gateway | API requests and transferred data                                                                                  |
| Lambda      | Invocations, duration, and retries; stream notifier invocations occur only when email notifications are configured |
| DynamoDB    | Provisioned table capacity, transactions, scans, and data storage                                                  |
| CloudWatch  | Log ingestion and stored log volume before seven-day expiration                                                    |
| Cognito     | Monthly active users and email verification/recovery behavior                                                      |
| SNS         | Published notification requests and email delivery                                                                 |

## Operating guidance

- Deploy only one development stack and avoid repeated parallel stacks.
- Leave `LowStockEmailAddress` blank unless the email feature is being demonstrated.
- Avoid generating high-volume scans, sales, or test data in AWS.
- Use CloudWatch metrics and logs already configured; do not enable detailed metrics, alarms, or dashboards without checking their price.
- Inspect the S3 deployment-artifact bucket created by SAM and remove obsolete build artifacts when safe.
- Export required data before deleting a stack. The frontend S3 bucket must be emptied before CloudFormation can delete it; confirm the exact project bucket before any cleanup.
