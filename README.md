# eBay Compta Belgique

Application web de préparation comptable trimestrielle eBay pour vendeur belge.

## Développement

Ouvrir le projet dans le devcontainer, puis lancer:

```sh
pnpm dev
```

Le projet privilégie:

- React Router en mode framework
- Chakra UI
- Cloudflare Workers
- business logic backend avec Effect, Schema, Context/Layer et erreurs typées
- architecture feature-based

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour les décisions d'architecture
et conventions à conserver dans les prochaines itérations.
