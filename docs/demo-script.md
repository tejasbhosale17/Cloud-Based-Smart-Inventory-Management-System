# Demonstration Script

This script is for use only after AWS deployment and frontend upload have been separately approved and completed. Do not use it to create resources before that approval.

## Before the demo

- Confirm the stack is deployed in the intended region and record the `FrontendUrl` and `ApiBaseUrl`.
- Confirm the frontend build uses the current stack outputs and CloudFront invalidation has completed.
- If showing email alerts, configure `LowStockEmailAddress` and confirm the SNS subscription in advance.
- Prepare an employee login and a disposable demo product. Do not display AWS credentials, access tokens, or private parameter files.

## Walkthrough

1. Open `FrontendUrl` and sign in through Cognito.
2. Show inventory summary cards, category chart, search/filter controls, and current products.
3. Create a product with a quantity safely above its low-stock threshold.
4. Search for the product, update one field, and confirm the table reflects the change.
5. Record a sale with a valid positive quantity. Show the sale success and reduced inventory.
6. If practical, attempt a sale greater than available stock. Show the conflict response and confirm quantity did not become negative.
7. If SNS email is enabled, reduce stock across the threshold and show the single transition email. Avoid repeating a low-stock transition that might send additional email.
8. Show CloudWatch API access logs and structured Lambda errors, emphasizing that request bodies and authorization headers are not logged.
9. End by describing cost controls and noting that cleanup requires preserving any data that must be retained.

## Expected results

- Protected API behavior requires sign-in.
- Product operations update the dashboard.
- Successful sale reduces stock and persists a sale atomically.
- Insufficient stock returns a conflict without a negative inventory value.
- Low-stock email is sent only when notifications are configured and the subscription is confirmed.
