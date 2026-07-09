# Agent Instructions

Lire d'abord `docs/ARCHITECTURE.md`. Ce fichier contient les decisions produit,
techniques et metier a conserver entre les sessions.

## Regles Prioritaires

- Developpement via VS Code Dev Containers. Ne pas supposer que Node/pnpm existent sur l'hote.
- Stack: TypeScript, React Router framework mode, Chakra UI, Cloudflare Workers, Effect.
- Architecture feature-based sous `app/features/*`.
- Business logic backend-first: le frontend affiche et collecte, le Worker calcule.
- Utiliser le cycle React Router `loader > view > action` autant que possible.
- Utiliser Effect pour la business logic significative:
  - `Effect` pour les pipelines.
  - `Schema` pour validation et types.
  - `Context.Tag` / `Layer` pour services et DI.
  - `Data.TaggedError` pour erreurs typees.
- Les routes React Router sont des adaptateurs minces entre HTTP/FormData et services Effect.
- Valider query params, route params, payload JSON et champs FormData avec Effect Schema.
- Eviter `try/catch` pour les erreurs attendues dans les actions/loaders; utiliser `Effect.match`,
  `Effect.catchAll` et les tags d'erreur.
- Les composants Chakra ne doivent pas contenir de calcul metier.
- Les erreurs utilisateur doivent etre en francais, comprehensibles, actionnables, sans stack trace.
- Ne pas stocker durablement les fichiers pour le MVP.

## Commandes Dans Le Devcontainer

```sh
pnpm dev
pnpm test
pnpm typecheck
pnpm build
```

## Points D'Attention

- Garder `shared` petit et transversal. Ne pas y deplacer de logique propre a une feature.
- Tester les services via DI avec fake layers quand une dependance externe intervient.
- Toute evolution de workflow doit preserver la generation de factures frais separees:
  une annexe EUR en premiere page, puis le PDF eBay officiel non modifie.
- Prochaine grande piece probable: `SessionRepository` injectable pour conserver l'etat
  du dossier entre etapes, avec migration future possible vers R2/Durable Object.
