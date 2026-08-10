# eBay Accounting Belgium

Web application for preparing quarterly eBay accounting records for a Belgian seller.

## Development

Install [Nix](https://nixos.org/download/) and
[devenv](https://devenv.sh/getting-started/), then enter the development shell:

```sh
devenv shell
```

Dependencies are installed automatically from `pnpm-lock.yaml`. Start the application with:

```sh
pnpm dev
```

Alternatively, start the declared development process directly with `devenv up`.

The project favors:

- React Router in framework mode
- Chakra UI
- Cloudflare Workers
- backend business logic with Effect, Schema, Context/Layer, and typed errors
- feature-based architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the architecture decisions
and conventions to preserve in future iterations.
