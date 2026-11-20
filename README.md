# Cloud-Based Smart Inventory Management System

An academic cloud computing project for managing products, inventory, and sales
with a React and TypeScript frontend and AWS serverless backend.

## Project structure

- `frontend/` - React, TypeScript, and Vite application.
- `backend/` - TypeScript AWS Lambda handlers.
- AWS infrastructure and service integrations will be added in their planned
  project phases.

## Local development

Requirements: Node.js 20 or newer and npm.

```powershell
npm install
npm run dev --workspace frontend
```

The starter Lambda handler is under `backend/src/handler.ts`. AWS deployment
configuration will be introduced in a later phase.

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
