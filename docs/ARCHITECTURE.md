# Architecture Decisions

Ce document conserve les instructions d'architecture et les conventions du projet.
Il sert de reference pour les prochains prompts et les prochaines iterations.

## Objectif Produit

Application web de preparation comptable trimestrielle eBay pour un vendeur belge.

Le MVP genere un dossier comptable ZIP a partir de fichiers uploades manuellement:

- Un ou plusieurs CSV ventes eBay.
- Un ou plusieurs CSV remboursements eBay.
- Pour chaque mois du trimestre:
  - PDF officiel facture frais eBay.
  - CSV detail frais eBay correspondant.

Une facture de frais eBay est toujours une paire obligatoire: PDF officiel + CSV detail frais.
L'interface permet d'ajouter plusieurs factures successivement, avec une dropzone par facture
qui doit contenir exactement cette paire de fichiers avant calcul/generation.

Workflow MVP:

- La page index regroupe tous les uploads du trimestre.
- Un seul bouton final genere le ZIP comptable.
- Les anciennes routes d'etapes peuvent rester comme adaptateurs techniques, mais le flux utilisateur principal
  doit rester mono-page tant que l'etat de session durable n'est pas introduit.

Le besoin principal est de calculer un total comptable EUR par facture de frais eBay.
Chaque facture finale doit rester separee et identifiable: on ajoute uniquement une page
d'annexe en premiere page, puis les pages du PDF eBay officiel sont copiees sans modification.

## Stack

- TypeScript strict.
- React Router en mode framework.
- Chakra UI pour l'interface.
- Cloudflare Workers pour le deploiement.
- Effect pour la business logic.
- Vitest pour les tests.
- `papaparse` pour CSV.
- `pdf-lib` pour PDF.
- `fflate` pour ZIP.
- `pnpm` comme package manager.
- Developpement via VS Code Dev Containers, pas via Docker manuel.

## Devcontainer

Le developpement local se fait en ouvrant le dossier dans VS Code avec Dev Containers.

Fichiers:

- `.devcontainer/devcontainer.json`

La configuration utilise directement l'image `node:24` dans `devcontainer.json`,
sans fichier Compose separe.

Commande de dev depuis le terminal du devcontainer:

```sh
pnpm dev
```

Ne pas supposer que `node`, `npm` ou `pnpm` sont disponibles sur l'hote.

## Architecture Feature-Based

L'architecture est organisee par feature, pas par couche technique globale.

Structure cible:

```txt
app/
  routes/
  features/
    dossier-setup/
    sales/
    refunds/
    ebay-fees/
    review/
    generation/
  shared/
    effect/
    errors/
    csv/
    money/
    countries/
    files/
    pdf/
    zip/
    clock/
    ui/
```

Chaque feature peut contenir:

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

`shared` doit rester transversal et stable. Ne pas y mettre de logique specifique a une feature.

## Backend-First

La business logic doit rester autant que possible cote Worker/backend.

Le frontend peut gerer:

- Etat d'affichage du wizard.
- Selection de fichiers.
- Formulaires de mapping.
- Corrections utilisateur.
- Affichage de previews, messages et syntheses retournes par le backend.

Le frontend ne doit pas porter:

- Aggregation comptable.
- Classification UE / hors UE.
- Parsing monetaire metier.
- Conversion EUR.
- Generation PDF/ZIP.
- Validation metier profonde.

## React Router: Loader > View > Action

Privilegier le cycle React Router:

- `loader`: charge l'etat affichable et les donnees necessaires.
- `view`: affiche via Chakra UI et collecte l'intention utilisateur.
- `action`: recoit le `FormData`, valide, appelle les services Effect backend, retourne messages ou redirige.

Les vues doivent rester minces. Les routes sont des adaptateurs entre HTTP/FormData et services Effect.

Les previews interactives peuvent utiliser `fetcher`, mais elles doivent toujours appeler le backend.

Tous les inputs aux frontieres React Router doivent etre valides avec Effect Schema:

- query params de `loader` / resource route
- route params quand des routes dynamiques existent
- payload JSON des actions API
- champs texte de `FormData`

Les fichiers `File` restent verifies explicitement comme fichiers, puis leurs metadonnees et champs
associes passent par des schemas. Ne pas lire directement `request.json()` ou `formData.get(...)`
pour construire de la business logic sans passer par un schema.

## Effect: Business Logic, Services et DI

Toute business logic significative doit utiliser Effect au maximum de ses capacites:

- `Effect` pour composer les pipelines.
- `Schema` pour valider et typer les inputs/outputs.
- `Context.Tag` et `Layer` pour les services et la DI.
- `Data.TaggedError` pour les erreurs typees.
- `Effect.runPromise` ou `Effect.runPromiseExit` uniquement aux frontieres HTTP/tests.
- Helpers de validation des frontieres dans `app/shared/effect/validation.ts`.

Pas de `throw` volontaire dans le core metier.
Pas de `Promise` nu dans le core metier, sauf dans les adapters live.
Eviter `try/catch` dans les actions/loaders React Router pour les erreurs attendues.
Preferer le canal d'erreur Effect:

- erreurs typees avec `_tag`
- composition avec `Effect.flatMap`
- normalisation finale avec `Effect.match` ou `Effect.catchAll`
- `Effect.runPromise` uniquement sur un programme dont les erreurs attendues sont deja transformees en reponse HTTP ou action data

Services transversaux:

- `CsvParser`
- `MoneyParser` / primitives money
- `CountryClassifier` / primitives countries
- `ExchangeRateProvider` a ajouter pour sources futures
- `PdfService`
- `ZipService`
- `ClockService`
- `FileNameService` / primitives filenames

Services feature:

- `DossierSetupService`
- `SalesService`
- `RefundsService`
- `EbayFeesService`
- `ReviewService`
- `GenerationService`

Les tests doivent pouvoir injecter des fake layers pour tester la business logic sans fichiers reels,
PDF reels, ZIP reels ou horloge systeme.

## Gestion Success/Error UX

Les erreurs et succes doivent etre geres gracieusement et etre comprehensibles pour l'utilisateur.

Messages utilisateur:

- En francais.
- Concrets.
- Actionnables.
- Attaches si possible a une etape, un fichier, une colonne, une facture ou une devise.
- Sans stack trace dans l'UI.

Format conceptuel:

```ts
type ViewMessage = {
  id: string;
  severity: "success" | "info" | "warning" | "error";
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

Les erreurs techniques restent en diagnostics/logs, pas dans l'interface principale.

Les warnings non bloquants peuvent etre acceptes explicitement avant generation.
Les erreurs bloquantes empechent la generation.

## Regles Metier

- Un dossier par annee et trimestre.
- Devise comptable EUR.
- Regrouper ventes et remboursements par pays.
- Classifier les pays en UE / hors UE.
- La Belgique est UE.
- Utiliser une liste codee des pays UE actuels.
- Tous les montants finaux sont en EUR.
- Arrondir a 2 decimales.
- Garder une trace du taux utilise.

Frais eBay:

- Calculer par devise:
  - total devise
  - taux utilise
  - total EUR
- Total facture EUR = somme des totaux EUR par devise.
- Priorite des taux/conversions:
  1. Si le CSV contient deja un montant converti en EUR, l'utiliser.
  2. Sinon, permettre un taux manuel.
  3. Sinon, utiliser `ExchangeRateProvider` live base sur les taux de reference BCE.

CSV detail frais eBay:

- Structure attendue stable du rapport `Details de la facture fiscale`.
- Colonnes fixes utilisees par defaut:
  - `Devise`
  - `Montant total`
- Le mois et l'annee de facture sont lus depuis la ligne `Periode`.
- Le frontend ne demande pas de mapping de colonnes ni de periode pour ce CSV.

PDF frais:

- Ne jamais fusionner les factures officielles en un seul PDF.
- Pour chaque facture:
  - Page 1: annexe conversion comptable EUR.
  - Pages suivantes: PDF eBay officiel original copie sans modification.

Annexe frais:

- Titre: `Annexe - Conversion comptable en EUR`.
- Mois.
- Annee.
- Nom du fichier PDF original.
- Tableau devise, montant devise, taux, montant EUR.
- Total comptable EUR visible.
- Mention: `Les pages suivantes correspondent a la facture eBay officielle non modifiee.`

## Fichiers Generes

ZIP final:

- `ventes_<annee>_<trimestre>.pdf`
- `remboursements_<annee>_<trimestre>.pdf`
- Pour chaque facture eBay:
  - `<mois>_frais_ebay_avec_annexe_eur.pdf`

Pas de fichier de synthese frais separe ni de CSV de controle pour le MVP actuel.

## Contraintes Cloudflare

- Ne pas stocker durablement les fichiers par defaut.
- Traitement en session uniquement pour le MVP.
- Prevoir migration future vers R2/Durable Objects/Queues/service separe si:
  - fichiers trop lourds
  - generation PDF trop couteuse
  - limites CPU/memoire Worker atteintes

Structurer les services pour rendre ce deplacement possible sans reecrire la business logic.

## Tests

Tests unitaires attendus:

- Classification pays UE / hors UE.
- Aggregation ventes par pays.
- Aggregation remboursements par pays.
- Aggregation frais par devise.
- Conversion EUR.
- Priorite montant EUR CSV avant taux manuel.
- Generation des noms de fichiers.
- Messages erreurs/succes utilisateur.
- Manifest ZIP.
- PDF frais: annexe avant pages originales.

Tests frontend:

- Legers.
- Portent sur affichage de `loaderData/actionData`, messages et etats.
- Ne testent pas la business logic metier.

## Priorites MVP

1. Wizard upload.
2. Parsing CSV.
3. Mapping colonnes.
4. Calculs ventes/remboursements par pays et UE/hors UE.
5. Calcul frais par devise et EUR depuis CSV.
6. Generation PDF ventes/remboursements.
7. Generation des PDF frais avec page annexe + PDF original.
8. ZIP final.

## Etat Actuel Important

Le backend de calcul/generation est pose avec Effect et services injectables.
Le wizard existe et certaines actions appellent deja les services backend.

Point important restant:

- Structurer la conservation de l'etat/fichiers entre etapes pour que la generation finale
  consomme automatiquement le dossier complet.
- Option recommandee: introduire un `SessionRepository` injectable, avec implementation MVP
  sans stockage durable et interface prete pour R2/Durable Object plus tard.
