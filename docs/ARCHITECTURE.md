# Architecture Decisions

This document records the project's architecture instructions and conventions.
It serves as a reference for future prompts and iterations.

## Product Goal

A web application for preparing quarterly eBay accounting records for a Belgian seller.

The MVP generates a ZIP accounting package from manually uploaded files:

- One or more eBay sales CSV files.
- One or more eBay refund CSV files.
- For each month in the quarter:
  - Official eBay fee invoice PDF.
  - Corresponding eBay fee details CSV.

An eBay fee invoice is always a mandatory pair: official PDF + fee details CSV.
The interface allows users to add several invoices in succession, with one drop zone per invoice.
Each drop zone must contain exactly this pair of files before calculation/generation.

MVP workflow:

- The index page groups all uploads for the quarter.
- A single final button generates the accounting ZIP.
- The main user flow is a single page: `routes/wizard.index.tsx`.
- Generation goes through the backend endpoint `routes/api.generate-upload.ts`.
- The old wizard step routes are no longer part of the MVP and must remain deleted
  until an explicit product requirement reactivates them.

The main requirement is to calculate an accounting total in EUR for each eBay fee invoice.
Each final invoice must remain separate and identifiable: only an appendix page is added
as the first page, after which the pages from the official eBay PDF are copied unmodified.

## Stack

- Strict TypeScript.
- React Router in framework mode.
- Chakra UI for the interface.
- Cloudflare Workers for deployment.
- Effect for business logic.
- Vitest for tests.
- Oxlint for strict linting.
- Oxfmt for formatting, with single quotes.
- `papaparse` for CSV.
- `pdf-lib` for PDF.
- `fflate` for ZIP.
- `pnpm` as the package manager.
- Reproducible local development through Nix and devenv.

## Development Environment

Local development is done inside the Nix environment declared with devenv.

Files:

- `devenv.nix`: Node.js, pnpm, dependency installation, and development process.
- `devenv.yaml`: pinned nixpkgs input declaration.
- `devenv.lock`: generated lock file for reproducible Nix inputs.
- `.envrc`: optional automatic shell activation through direnv.

The environment provides Node.js 24 and pnpm. Dependencies are installed from
`pnpm-lock.yaml` when devenv initializes the environment.

Enter the environment and start development with:

```sh
devenv shell
pnpm dev
```

The same development process can be started with `devenv up`. Do not assume that
`node`, `npm`, or `pnpm` are available outside the devenv shell.

## Feature-Based Architecture

The architecture is organized by feature, not by global technical layer.

Current structure:

```txt
app/
  routes/
    wizard.tsx
    wizard.index.tsx
    api.generate-upload.ts
  features/
    sales/
    ebay-fees/
    generation/
  shared/
    clock/
    countries/
    csv/
    effect/
    errors/
    files/
    money/
    pdf/
    ui/
    zip/
```

Each feature may contain:

```txt
components/
loader.ts
action.ts
schemas.ts
types.ts
errors.ts
messages.ts
ports.ts
service.ts
layers.ts
calculations.ts
*.test.ts
```

`shared` must remain cross-cutting and stable. Do not put feature-specific logic there.

The old `dossier-setup`, `refunds`, and `review` features have been removed from the MVP.
Refunds use the same aggregation service as sales through `kind: 'refunds'` and remain
orchestrated by `features/generation`.

## Backend First

Business logic must remain on the Worker/backend side as much as possible.

The frontend may handle:

- Wizard display state.
- File selection.
- Adding/removing pairs of eBay fee files.
- Displaying previews, messages, and summaries returned by the backend.

The frontend must not handle:

- Accounting aggregation.
- EU / non-EU classification.
- Business-specific monetary parsing.
- EUR conversion.
- PDF/ZIP generation.
- Deep business validation.

The CSV mappings currently supported by the MVP are fixed on the backend:

- sales/refunds: default eBay columns defined in `features/generation/form-upload.ts`.
- eBay fees: `Devise` and `Montant total` through `features/ebay-fees/schemas.ts`.

## React Router: Loader > View > Action

Favor the React Router cycle:

- `loader`: loads displayable state and required data.
- `view`: renders with Chakra UI and collects user intent.
- `action`: receives `FormData`, validates it, calls backend Effect services, and returns messages or redirects.

Views must remain thin. Routes are adapters between HTTP/FormData and Effect services.

In the current MVP:

- `routes/wizard.index.tsx` displays the single-form page and handles ZIP download.
- `routes/api.generate-upload.ts` receives the `FormData` and returns the ZIP.
- Both routes delegate to `generatePackageFromUploadForm`.

Future interactive previews may use `fetcher`, but they must always call the backend.

All inputs at React Router boundaries must be validated with Effect Schema:

- query parameters for a `loader` / resource route
- route parameters when dynamic routes exist
- JSON payloads for API actions
- text fields in `FormData`

`File` values are still explicitly checked as files; their metadata and associated fields
then pass through schemas. Do not read `request.json()` or `formData.get(...)` directly
to construct business logic without going through a schema.

## Effect: Business Logic, Services, and DI

All significant business logic must use Effect to the fullest extent possible:

- `Effect` to compose pipelines.
- `Schema` to validate and type inputs/outputs.
- `Context.Tag` and `Layer` for services and DI.
- `Data.TaggedError` for typed errors.
- `Effect.fn` for relevant business/service functions to obtain named spans.
- `Effect.runPromise` or `Effect.runPromiseExit` only at HTTP/test boundaries.
- Boundary validation helpers in `app/shared/effect/validation.ts`.

No intentional `throw` in the business core.
No bare `Promise` in the business core, except in live adapters.
Avoid `try/catch` in React Router actions/loaders for expected errors.
Prefer Effect's error channel:

- typed errors with `_tag`
- composition with `Effect.flatMap`
- final normalization with `Effect.match` or `Effect.catchAll`
- `Effect.runPromise` only on a program whose expected errors have already been transformed into an HTTP response or action data

Cross-cutting services:

- `CsvParser`
- money primitives
- country primitives
- `ExchangeRateProvider`
- `PdfService`
- `ZipService`
- `ClockService`
- filename primitives and upload validation

Feature services:

- `features/sales/service.ts`: aggregation of sales/refunds by country.
- `features/ebay-fees/service.ts`: aggregation of fees by currency and EUR conversion.
- `features/generation/service.ts`: PDF/ZIP orchestration.
- `features/generation/form-upload.ts`: adaptation of uploaded `FormData` to business input.

Tests must be able to inject fake layers to test business logic without real files,
real PDFs, real ZIPs, or the system clock.

The `LiveWorkerLayer` currently assembles `CsvParserLive`, `PdfServiceLive`, `ZipServiceLive`,
`ClockServiceLive`, and `ExchangeRateProviderLive`.

## Success/Error UX Management

Errors and successes must be handled gracefully and be understandable to the user.

User-facing messages:

- In French.
- Specific.
- Actionable.
- Attached, where possible, to a step, file, column, invoice, or currency.
- Without a stack trace in the UI.

Conceptual format:

```ts
type ViewMessage = {
  id: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  text: string;
  target?: {
    step?: string;
    fileName?: string;
    column?: string;
    invoiceId?: string;
    currency?: string;
  };
};
```

Technical errors remain in diagnostics/logs, not in the main interface.

Non-blocking warnings may be explicitly accepted before generation.
Blocking errors prevent generation.

## Business Rules

- One case per year and quarter.
- Accounting currency: EUR.
- Group sales and refunds by country.
- Classify countries as EU / non-EU.
- Belgium is in the EU.
- Use a hard-coded list of current EU countries.
- All final amounts are in EUR.
- Round to 2 decimal places.
- Keep a record of the rate used.
- Refunds are aggregated by the same pipeline as sales and appear in the combined
  quarterly PDF alongside sales.

eBay fees:

- Calculate by currency:
  - total in original currency
  - rate used
  - total in EUR
- Invoice total in EUR = sum of totals in EUR by currency.
- Rate/conversion priority:
  1. If the CSV already contains an amount converted to EUR, use it.
  2. Otherwise, allow a manual rate.
  3. Otherwise, use the live `ExchangeRateProvider` based on ECB reference rates.

eBay fee details CSV:

- Expected stable structure of the `Details de la facture fiscale` report.
- Fixed columns used by default:
  - `Devise`
  - `Montant total`
- The invoice month and year are read from the `Periode` row.
- The frontend does not request column or period mapping for this CSV.

Fee PDFs:

- Never merge official invoices into a single PDF.
- For each invoice:
  - Page 1: EUR accounting conversion appendix.
  - Following pages: original official eBay PDF copied without modification.

Fee appendix:

- Title: `Annexe - Conversion comptable en EUR`.
- Month.
- Year.
- Original PDF filename.
- Table with currency, amount in original currency, rate, and amount in EUR.
- Clearly visible accounting total in EUR.
- Notice: `Les pages suivantes correspondent a la facture eBay officielle non modifiee.`

The appendix page must remain the first page of the generated PDF, and the official eBay PDF
must remain copied without modification after this appendix.

## Generated Files

Final ZIP:

- `dossier_comptable_ebay_<annee>_<trimestre>.zip`
- `ventes_<annee>_<trimestre>.pdf`: combined sales + refunds PDF with details for both sections.
- For each eBay invoice:
  - `<mois>_<invoiceId>_frais_ebay_avec_annexe_eur.pdf`

No separate fee summary file or control CSV for the current MVP.

## Cloudflare Constraints

- Do not persist files by default.
- In-memory processing during the request for the MVP.
- `wrangler.toml` enables `observability` and `observability.traces`.
- `workers/app.ts` adds global HTTP security headers:
  CSP, referrer policy, nosniff, and frame deny.
- Plan a future migration to R2/Durable Objects/Queues/a separate service if:
  - files are too large
  - PDF generation is too expensive
  - Worker CPU/memory limits are reached

Structure services so this move is possible without rewriting the business logic.

## Code Quality

TypeScript must remain very strict:

- `strict`
- `exactOptionalPropertyTypes`
- `noUncheckedIndexedAccess`
- `noImplicitOverride`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noPropertyAccessFromIndexSignature`
- `noUnusedLocals`
- `noUnusedParameters`
- `forceConsistentCasingInFileNames`

Oxlint must remain strict:

- `correctness`, `suspicious`, and `perf` categories treated as errors.
- TypeScript, React, JSX a11y, Vitest, imports, Promise, Unicorn, and OXC plugins.
- documented exceptions only when they match the current stack:
  - `react/react-in-jsx-scope`: React 19 + JSX transform.
  - `import/no-unassigned-import`: React Router/Vite CSS imports.
  - `no-await-in-loop`: sequential PDF generation when page order matters.

Oxfmt is configured with single quotes.

## Tests

Expected unit tests:

- EU / non-EU country classification.
- Sales aggregation by country.
- Refund aggregation by country.
- Fee aggregation by currency.
- EUR conversion.
- Priority of the CSV EUR amount over a manual rate.
- Generated filenames.
- User-facing error/success messages.
- ZIP manifest.
- Fee PDF: appendix before original pages.

Frontend tests:

- Lightweight.
- Cover rendering of `loaderData/actionData`, messages, and states.
- Do not test business logic.

## MVP Priorities

1. Upload wizard.
2. CSV parsing.
3. Fixed MVP column mappings.
4. Sales/refund calculations by country and EU/non-EU.
5. Fee calculations by currency and EUR from CSV.
6. Combined sales/refunds PDF generation.
7. Fee PDF generation with appendix page + original PDF.
8. Final ZIP.

## Important Current State

The MVP is currently centered on a single page:

- `routes/wizard.index.tsx`: collects all files for the quarter.
- `routes/api.generate-upload.ts`: backend ZIP generation endpoint.
- `features/generation/form-upload.ts`: upload validation, file reading, and business input construction.
- `features/generation/service.ts`: orchestration of sales/refunds/fees, PDFs, and ZIP.

The calculation/generation backend is built with Effect, `Effect.fn`, and injectable services.
The old step routes and obsolete features have been removed.

Important remaining point if the product becomes multi-step again:

- Introduce an injectable `SessionRepository` to preserve state/files between steps.
- Provide an interface compatible with a future migration to R2/Durable Objects.
- Do not reintroduce multi-step wizard routes without this explicit storage.
