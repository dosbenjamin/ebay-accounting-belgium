# eBay Compta Belgique

Application web de preparation comptable trimestrielle eBay pour vendeur belge.

## Developpement

Ouvrir le projet dans le devcontainer, puis lancer:

```sh
pnpm dev
```

Le projet privilegie:

- React Router en mode framework
- Chakra UI
- Cloudflare Workers
- business logic backend avec Effect, Schema, Context/Layer et erreurs typees
- architecture feature-based

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour les decisions d'architecture
et conventions a conserver dans les prochaines iterations.
