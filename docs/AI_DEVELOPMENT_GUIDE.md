# AI Development Guide

This file defines mandatory execution rules for AI agents working on this repository.

## 1. Read Order (Mandatory)

Before implementing anything, AI must read:

1. `docs/PROJECT_REQUIREMENT.md`
2. `docs/ARCHITECTURE.md`
3. `docs/CODING_RULES.md`

## 2. Folder Ownership

- `app/**`: route pages and API route adapters only.
- `components/**`: UI and feature components.
- `src/services/**`: all frontend API calls.
- `src/lib/axios.js`: single HTTP client.
- `src/shared/**`: reusable hooks/constants/mock/utils.
- `server/modules/**`: backend business logic.
- `server/models/**`: persistence models.
- `server/lib/**`: backend infra utilities.
- `server/middlewares/**`: auth and request middleware.

## 3. Strict Do / Don't

### Do

- Add or update API integrations in `src/services/*`.
- Keep API route files thin and delegate to controllers.
- Keep module logic in `server/modules/<feature>`.
- Reuse aliases: `@/hooks/*`, `@/constants/*`, `@/mock/*`, `@/utils/*`.

### Don't

- Do not call `fetch('/api/...')` directly in pages/components.
- Do not import `server/**` into `components/**`.
- Do not place business rules in `app/api/**/route.js`.
- Do not create mixed-responsibility files.

## 4. Implementation Workflow

1. Identify feature module (`auth`, `user`, `content`, etc.).
2. Add/adjust backend logic under `server/modules/<feature>`.
3. Expose through adapter route in `app/api/**/route.js` if needed.
4. Add/adjust frontend function in `src/services/<feature>.service.js`.
5. Consume service from page/component.
6. Run error/syntax checks.
7. Update docs if structure or rule changes.

## 5. Naming Conventions

- Backend files:
  - `<feature>.controller.js`
  - `<feature>.service.js`
  - `<feature>.repository.js`
  - `<feature>.validation.js`
- Frontend service file:
  - `<feature>.service.js`

## 6. PR/Change Checklist

- [ ] No direct page/component API fetch calls.
- [ ] All API calls route through `src/services/**`.
- [ ] New backend logic in module layer, not route handler.
- [ ] Import aliases remain valid.
- [ ] Docs updated if architecture changed.

## 7. Long-term Scalability Direction

- Keep domain boundaries clear for future extraction into separate services.
- Preserve API response contract consistency (`success`, `data`, `error`).
- Keep test/practice history as immutable snapshots for review stability.
