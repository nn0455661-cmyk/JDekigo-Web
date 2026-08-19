# Coding Rules

Always follow these files in this order:

1. `docs/PROJECT_REQUIREMENT.md`
2. `docs/AI_DEVELOPMENT_GUIDE.md`
3. `docs/ARCHITECTURE.md`

## 1. Core Rules

- Do NOT write everything in one file.
- Use reusable components.
- Keep code modular and maintainable.
- Follow TailwindCSS design system.
- Use `lucide-react` icons.
- Keep UI clean, consistent, and responsive.

## 2. Layer Rules (Mandatory)

- Never call API directly inside `app/**` pages or `components/**`.
- Always call API through `src/services/**`.
- Always use `src/lib/axios.js` as the only HTTP client.
- `app/api/**` must remain thin adapter routes.
- Business logic lives in `server/modules/**`.

## 3. Import Rules

- Shared utilities/hooks/constants/mock data must be imported from `@/hooks/*`, `@/constants/*`, `@/mock/*`, `@/utils/*` aliases (resolved to `src/shared/**`).
- Avoid deep relative imports across domains.

## 4. Naming and File Conventions

- Frontend services: `<feature>.service.js`
- Backend module files: `<feature>.controller.js`, `<feature>.service.js`, `<feature>.repository.js`, `<feature>.validation.js`
- Keep one responsibility per file.

## 5. Change Safety

- Preserve public API contract unless explicitly requested.
- Avoid unrelated refactors in the same PR.
- Update docs when structure, flow, or conventions change.
