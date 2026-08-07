# Agent Instructions

Read `docs/ARCHITECTURE.md` first. It contains the product, technical, and business
decisions that must be preserved across sessions.

## Priority Rules

- Develop using VS Code Dev Containers. Do not assume that Node/pnpm are available on the host.
- Stack: TypeScript, React Router framework mode, Chakra UI, Cloudflare Workers, Effect.
- Use a feature-based architecture under `app/features/*`.
- Backend-first business logic: the frontend displays and collects data; the Worker performs calculations.
- Use the React Router `loader > view > action` cycle whenever possible.
- Use Effect for significant business logic:
  - `Effect` for pipelines.
  - `Schema` for validation and types.
  - `Context.Tag` / `Layer` for services and DI.
  - `Data.TaggedError` for typed errors.
- React Router routes are thin adapters between HTTP/FormData and Effect services.
- Validate query parameters, route parameters, JSON payloads, and FormData fields with Effect Schema.
- Avoid `try/catch` for expected errors in actions/loaders; use `Effect.match`,
  `Effect.catchAll`, and error tags.
- Chakra components must not contain business calculations.
- User-facing errors must be in French, understandable, actionable, and contain no stack trace.
- Do not persist files for the MVP.

## Commands in the Dev Container

```sh
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

## Important Considerations

- Keep `shared` small and cross-cutting. Do not move feature-specific logic into it.
- Test services through DI with fake layers when an external dependency is involved.
- Any workflow change must preserve the generation of separate fee invoices:
  a EUR appendix on the first page, followed by the unmodified official eBay PDF.
- The next major component will likely be an injectable `SessionRepository` to preserve
  the case state between steps, with a possible future migration to R2/Durable Objects.
