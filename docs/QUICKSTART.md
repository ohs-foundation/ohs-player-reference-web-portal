# Quickstart (about five minutes)

1. **Prerequisites:** Node 20+, pnpm 9+, Docker (for local FHIR + Keycloak).

2. **Clone and install**

```bash
git clone <this-repo>
cd ohs-player-reference-web-portal
pnpm install
```

3. **Start backing services**

```bash
docker compose up -d
```

Wait until HAPI responds at `http://localhost:8080/fhir/metadata` and Keycloak at `http://localhost:8090` (realm `ohs` is imported from `infra/keycloak/ohs-realm.json`).

4. **Seed demo FHIR data** (optional)

```bash
FHIR_BASE_URL=http://localhost:8080/fhir pnpm seed
```

5. **Configure the reference app**

```bash
cp .env.example .env
# Defaults in src/config/env.ts work for local HAPI + Keycloak; adjust VITE_* if needed.
```

6. **Run the portal**

```bash
pnpm dev
```

Open `http://localhost:5173`, sign in with Keycloak (e.g. `admin-user` / `admin` from the imported realm). By default `VITE_FHIR_BASE_URL` targets HAPI directly at `http://localhost:8080/fhir`. Switch to `http://localhost:8180/fhir` if you want requests to go through the `ohs-info-gateway` service in `docker-compose.yml` instead.

## Troubleshooting

**Keycloak shows “Invalid username or password”.** Use realm users from `infra/keycloak/ohs-realm.json`, not the Keycloak server bootstrap admin from `docker-compose.yml` (`KC_BOOTSTRAP_ADMIN_*` is for `http://localhost:8090/admin`, not for signing into realm `ohs`). Valid examples: `admin-user` / `admin`, `manager-user` / `manager`.

**Those users still fail.** In the admin console, open realm **ohs** and check **Users**. If `admin-user` / `manager-user` are missing, remove the Keycloak container’s persisted data volume and run `docker compose up -d` again so `--import-realm` can load `ohs-realm.json` on a fresh store.

## OHS Info Gateway

Set `OHS_GATEWAY_IMAGE` to your published gateway image in `docker-compose.yml` if you replace the bundled nginx development proxy. Custom endpoints such as `/custom/users` are implemented by that gateway, not this repository.
