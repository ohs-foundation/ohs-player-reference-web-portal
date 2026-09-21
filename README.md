# OHS Player Reference Web Portal

Monorepo for the **OHS Player Web** portal: the publishable **`ohs-player-web-core`** library (OIDC Authorization Code + PKCE, RBAC, a unified FHIR client, feature flags, theming, i18n, SDC forms and Radix-based behaviour), the **`ohs-player-web-shell`** package (the portal frame, primitive kit and extension host), and the applications built on them.

## Layout

- [`apps/ohs-player-web`](apps/ohs-player-web) — Vite + React reference portal (users, locations, organizations, care teams, setup wizard, FHIR viewer).
- [`apps/ohs-player-web-example`](apps/ohs-player-web-example) — A second application on the shell, with one extension (`schedules`).
- [`packages/ohs-player-web-core`](packages/ohs-player-web-core) — Library published as `ohs-player-web-core`.
- [`packages/ohs-player-web-shell`](packages/ohs-player-web-shell) — Portal frame, primitive kit and extension host, published as `ohs-player-web-shell`.
- [`docker-compose.yml`](docker-compose.yml) — Local HAPI FHIR R4, Keycloak (realm import), optional nginx dev gateway in front of FHIR.
- [`docs/`](docs/) — [Architecture overview](docs/ARCHITECTURE.md), [`CORE_PUBLIC_API.md`](docs/CORE_PUBLIC_API.md) (full `ohs-player-web-core` public API), [quickstart](docs/QUICKSTART.md), [customization tour](docs/CUSTOMIZING.md), [extension guide](docs/EXTENDING.md), [theming](docs/THEMING.md) and [deployment](docs/DEPLOYMENT.md).

## Quickstart

See [docs/QUICKSTART.md](docs/QUICKSTART.md).

## License

See [LICENSE](LICENSE).
