# Architecture

## 1. Tech Stack

- Next.js App Router (JavaScript)
- React + TailwindCSS
- MongoDB (server-side modules)
- Axios client for frontend service layer

## 2. Current Layered Architecture

### 2.1 Frontend App Layer

- `app/**`: route pages and route handlers
- `components/**`: reusable UI + feature panels + providers
- `src/lib/axios.js`: single HTTP client
- `src/services/**`: all frontend API service calls
- `src/shared/**`: shared hooks/constants/mock/utils

### 2.2 Backend Domain Layer

- `server/modules/**`: business modules (`auth`, `user`, `content`)
- `server/models/**`: data models
- `server/lib/**`: infra helpers (`mongoose`, `jwt`, `bcrypt`)
- `server/middlewares/**`: auth middleware
- `server/utils/**`: response and error helpers

### 2.3 API Adapter Layer

- `app/api/**/route.js`: thin adapters only
- Rule: route handlers delegate to `server/modules/**.controller` and avoid embedding business logic.

## 3. Data Flow

1. UI/Page calls `src/services/*`.
2. Service uses `src/lib/axios.js`.
3. Request hits `app/api/*`.
4. API route delegates to `server/modules/*/controller`.
5. Controller -> validation -> service -> repository -> model/database/mock.

## 4. Dependency Direction (Strict)

- `app/components` -> `src/services` -> `app/api` -> `server/modules` -> `server/repository/model`
- Shared helpers flow inward only.
- Forbidden direct calls:
  - `app/**` directly calling `fetch('/api/...')`.
  - `components/**` directly importing `server/**`.
  - `app/api/**` directly reading mock files.

## 5. Scalability Notes

- Add new domain features under `server/modules/<feature>` and `src/services/<feature>.service.js`.
- Keep module boundaries clear to make migration to external microservices possible later.
- Keep API contracts stable (`success`, `data`, `error`) to avoid UI breakages.
