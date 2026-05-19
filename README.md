# OHS Player Reference Web Portal

Monorepo for the **OHS Player Web** reference application and the publishable **`ohs-player-web-core`** library: OIDC (Authorization Code + PKCE), RBAC primitives, a unified FHIR client, feature flags, theming, i18n, and Radix-based UI primitives.

## Layout

- [`apps/ohs-player-web`](apps/ohs-player-web) — Vite + React reference portal (users, locations, organizations, care teams, dashboard).
- [`packages/ohs-player-web-core`](packages/ohs-player-web-core) — Library published as `ohs-player-web-core`.
- [`docker-compose.yml`](docker-compose.yml) — Local HAPI FHIR R4, Keycloak (realm import), optional nginx dev gateway in front of FHIR.
- [`docs/`](docs/) — Architecture overview, [`CORE_PUBLIC_API.md`](docs/CORE_PUBLIC_API.md) (full `ohs-player-web-core` public API), quickstart, and extension guide.

## Quickstart

See [docs/QUICKSTART.md](docs/QUICKSTART.md).

## License

See [LICENSE](LICENSE).
