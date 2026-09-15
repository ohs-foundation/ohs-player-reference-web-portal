# Deployment — OHS Player Web (frontend)

How to deploy the player web app (`ohs-player-web`) as a Docker image on a Linux VM.

**Scope:** this covers the **frontend only**. The FHIR server (HAPI), the identity provider (Keycloak), and the OHS Info Gateway are **external prerequisites deployed and owned by the backend team** — this doc explains how to *link* the web app to them, not how to stand them up.

---

## 1. What you are deploying

The web app is a **Vite single-page application**. There is no Node server at runtime — the build produces static assets (`apps/ohs-player-web/dist`) that are served by nginx.

The repo ships a multi-stage `apps/ohs-player-web/Dockerfile`:

1. **Build stage** (Node 22 + pnpm) runs `turbo run build --filter=ohs-player-web` → static `dist/`.
2. **Serve stage** (nginx 1.27) copies `dist/` into `/usr/share/nginx/html` and exposes port `80`.

The deploy target is **this Docker image, run on a Linux VM**.

> **Two layers of configuration — read this first.** The `VITE_*` settings (FHIR URL, OIDC issuer, client id, FHIR version, flags) are **baked into the bundle at build time** as Docker build args; setting them on the running container has no effect. They are now the **fallback** layer. The **runtime configuration document**, `portal-config.json`, is fetched from next to the bundle when the app starts, and any field it sets wins over the baked value. Change the document and reload to reconfigure a running deployment **without rebuilding** ([section 4](#4-runtime-configuration-document)).

---

## 2. Prerequisites (provided by the backend team)

Confirm these are deployed and get their URLs **before** building, because two of them are baked into the image:

| Dependency | What it is | The web app needs |
| ---------- | ---------- | ----------------- |
| OHS Info Gateway | Reverse proxy + transactional `/custom/*` (`/api/users`, groups, roles) and the FHIR access-checker | Its base URL (ends in `/fhir`) → `VITE_FHIR_BASE_URL` |
| HAPI FHIR | FHIR R4 data store | Reached **through the gateway**, not directly |
| Keycloak | OIDC identity provider (realm `ohs`) | Its issuer URL → `VITE_OIDC_ISSUER`; a registered client id → `VITE_CLIENT_ID` |

Notes:

- The SPA talks to FHIR **via the gateway** (`VITE_FHIR_BASE_URL` points at the gateway, not HAPI directly). The gateway runs the access-checker and owns the `/custom/*` transactional routes. `FhirClient` derives the gateway root by stripping a trailing `/fhir` from `VITE_FHIR_BASE_URL`, so **keep that URL ending in `/fhir`**.
- Keycloak must have a client registered for the app (default id `ohs-player-web`) with the deployed web origin in its **Valid redirect URIs**, **Valid post logout redirect URIs** (the app returns to `{origin}/logout` after sign-out) and **Web origins** (OIDC Authorization Code + PKCE). Coordinate this with whoever owns Keycloak.

---

## 3. Build-time configuration

| Build arg | Purpose | Example (production) |
| --------- | ------- | -------------------- |
| `VITE_FHIR_BASE_URL` | Gateway FHIR base URL (must end in `/fhir`) | `https://gateway.example.org/fhir` |
| `VITE_OIDC_ISSUER` | Keycloak realm issuer | `https://auth.example.org/realms/ohs` |
| `VITE_CLIENT_ID` | Keycloak client id for the app | `ohs-player-web` |
| `VITE_FHIR_VERSION` | FHIR version | `R4` |

Defaults live in `apps/ohs-player-web/Dockerfile` (and `.env.example`) and point at local dev hosts — **always override them for a real deployment**, either here or in the configuration document. Feature flags (`VITE_FLAG_*`) and the optional `VITE_THEME_ALT` default to the values in `.env.example`; override at build time only if a deployment needs different ones.

Every value in this table is a fallback: the configuration document (section 4) wins for any field it sets.

---

## 4. Runtime configuration document

The image serves `apps/ohs-player-web/public/portal-config.json` at `/portal-config.json`, next to `index.html` (`/usr/share/nginx/html/portal-config.json` inside the container). The app fetches it once at startup, before it renders, and validates it against `portal-config.schema.json`, which is served beside it. The document's `$schema` key points at that file, so editors validate as you type.

| Field | Holds | Fallback when absent |
| --- | --- | --- |
| `product.name` | Product name shown in the top bar and on the sign-in page | the built-in title |
| `fhirBaseUrl` | Gateway FHIR base URL (keep it ending in `/fhir`) | `VITE_FHIR_BASE_URL` |
| `fhirVersion` | `R4`, `R5` or `STU3` | `VITE_FHIR_VERSION` |
| `oidcIssuer`, `clientId` | Keycloak realm issuer and client id | `VITE_OIDC_ISSUER`, `VITE_CLIENT_ID` |
| `brand.overrides`, `brand.darkOverrides` | Colour pins per theme role, light and dark (see [THEMING.md](./THEMING.md)) | the built-in pins |
| `flags` | Feature flags by name: `userMgmt`, `locationMgmt`, `careTeams`, `dashboard`, `orgMgmt`, `setupWizard`, `fhirViewer` | the matching `VITE_FLAG_*` |
| `navigation` | Sidebar entries: `id`, `to`, `labelKey`, `order`, and `requires` with a `flag` and a `permission` | the built-in sidebar |
| `permissionMap` | Permission key to the roles that hold it | the built-in map |
| `locale`, `messages` | Locale and message overrides by key | `en`, the built-in messages |
| `customEndpoints` | Gateway route alias to path | the built-in aliases |
| `questionnaireVariant` | Bundled questionnaire set | `VITE_QUESTIONNAIRE_VARIANT` |

Every field is optional. The reference document carries the product name, brand pins, sidebar, permission map, locale and endpoint aliases. It leaves the connection settings, flags and questionnaire variant to `VITE_*`, so each environment's build args keep applying until you add them.

**Fallback order, per field.** Each value comes from the first of these that sets it:

1. `portal-config.json` as fetched now.
2. The last valid document this browser loaded, used only when the fetch fails or the document is invalid.
3. The `VITE_*` value baked in at build time.
4. The default in `apps/ohs-player-web/src/config/env.ts` or `platform.ts`.

Maps such as `flags`, `permissionMap`, `messages`, `customEndpoints` and the brand pins combine key by key, so a document can override one flag and leave the rest to the fallback. A `navigation` list replaces the whole sidebar, because its order matters. Entries are sorted by `order`, and the built-in entries are spaced ten apart so a new one can slot in between.

**When the document is missing or bad:**

- **Missing or unreachable** (404, network error, not JSON): the app starts without an error, on the last valid document this browser loaded or, failing that, on the build-time values. With the reference document, the build-time values render identically.
- **Invalid** (unknown field, wrong type, missing `order` on a navigation entry, and so on): the app still starts on the fallback values. The error names the field and the expected type, for example `✖ Invalid input: expected boolean, received string → at flags.userMgmt`. It goes to the platform `onError` callback, and in development it also appears as an error toast.
- **The checked-in document** is validated when the image is built: `pnpm build` fails on an invalid `portal-config.json`, and `pnpm config:check` runs the same check on its own. After changing the schema, regenerate `portal-config.schema.json` with `pnpm config-schema:generate`.

**Changing it on a running deployment.** Mount your own document over the image's copy and reload the browser; no rebuild is needed:

```bash
docker run -d \
  --name ohs-player-web \
  --restart unless-stopped \
  -p 8080:80 \
  -v /srv/ohs-player-web/portal-config.json:/usr/share/nginx/html/portal-config.json:ro \
  ohs-player-web:1.0.0
```

For example, to point an image at another environment and turn a feature off:

```json
{
  "$schema": "./portal-config.schema.json",
  "fhirBaseUrl": "https://gateway.example.org/fhir",
  "oidcIssuer": "https://auth.example.org/realms/ohs",
  "clientId": "ohs-player-web",
  "flags": { "fhirViewer": false }
}
```

The app requests the document with `cache: no-cache`, so every page load revalidates it. If you change `oidcIssuer` or `clientId`, the Keycloak client needs the same redirect URIs and web origins as in section 2.

---

## 5. Get the code on the VM

The build runs **inside Docker** (the Dockerfile's build stage provides Node 22 + pnpm 9.15.4), so the VM only needs **Docker** and **git** — no local Node/pnpm toolchain.

```bash
git clone https://github.com/ohs-foundation/ohs-player-reference-web-portal.git
cd ohs-player-reference-web-portal
git checkout main          # or the release tag/branch you are deploying
```

> Deploy from a known ref — the default branch `main`, or a specific release tag/branch — not an arbitrary feature branch. Whatever you check out is what gets built in the next step.

---

## 6. Build the image

From the repo root on the VM (or any build host with Docker):

```bash
docker build \
  -f apps/ohs-player-web/Dockerfile \
  --build-arg VITE_FHIR_BASE_URL=https://gateway.example.org/fhir \
  --build-arg VITE_OIDC_ISSUER=https://auth.example.org/realms/ohs \
  --build-arg VITE_CLIENT_ID=ohs-player-web \
  --build-arg VITE_FHIR_VERSION=R4 \
  -t ohs-player-web:1.0.0 \
  .
```

The build context is the **repo root** (`.`), not the app folder — the Dockerfile copies the workspace (`packages/ohs-player-web-core`, `packages/ohs-player-web-shell` and `apps/ohs-player-web`) and installs with the frozen lockfile.

> **Image tag.** The `-t ohs-player-web:<tag>` part is just a label you choose; the repo doesn't fix one. Pick a scheme and stick to it so you can roll back to a known tag — e.g. the release version `ohs-player-web:1.0.0`, or the git short SHA `ohs-player-web:$(git rev-parse --short HEAD)`. Avoid `latest` for deploys (it makes rollbacks ambiguous). The examples below use `1.0.0`.

> CI does **not** build or push this image (it only lints/tests/builds the code). Build it here, or wire up your own registry push if you prefer pulling a pre-built tag onto the VM.

---

## 7. Run on the Linux VM

```bash
docker run -d \
  --name ohs-player-web \
  --restart unless-stopped \
  -p 8080:80 \
  ohs-player-web:1.0.0
```

The container serves on port `80` internally; map it to whatever host port your reverse proxy/firewall expects (example uses `8080`). The app is then reachable at `http://<vm-host>:8080/`.

For a single-host stack you can instead run the `ohs-player-web` service from the repo's `docker-compose.yml` (it carries the same build args) — but per the deployment plan the gateway/HAPI/Keycloak services there are **dev stand-ins**; in production those point at the backend team's real instances via the URLs in step 3.

---

## 8. Reverse proxy & TLS (recommended)

Front the container with a reverse proxy on the VM (nginx/Caddy/Traefik) to terminate TLS and serve on 443:

- Proxy `https://<your-domain>/` → `http://127.0.0.1:8080/` (the container).
- Use that public `https://` origin as the Keycloak client's redirect URI / web origin.
- The SPA is a static bundle, so the proxy just needs to forward to the container; it does **not** need any special SPA-fallback config (nginx inside the image already serves `index.html`).

---

## 9. Verify the deployment

1. **App loads:** browse to the public URL → the login screen renders.
2. **Auth:** sign in via Keycloak → you land on the dashboard (confirms `VITE_OIDC_ISSUER` / `VITE_CLIENT_ID` and the Keycloak redirect-URI config are correct).
3. **Data:** the dashboard KPI counts and tables populate (confirms `VITE_FHIR_BASE_URL` reaches the gateway and the gateway reaches HAPI).
4. **Transactional routes:** create a user (or any write) → succeeds and writes an audit entry. A `501` on `/custom/*` means the gateway is the dev nginx stand-in, not the real backend gateway — escalate to the backend team.

---

## 10. Redeploying / changing configuration

A change to a field the configuration document carries (connection settings, flags, sidebar, permissions, brand pins and the rest in section 4) needs **no rebuild**: edit the mounted `portal-config.json` and reload the browser.

A change to a `VITE_*` fallback, or to code, requires a **rebuild**:

```bash
# rebuild with the new values under a new tag, then replace the running container
docker build -f apps/ohs-player-web/Dockerfile --build-arg VITE_... -t ohs-player-web:1.0.1 .
docker stop ohs-player-web && docker rm ohs-player-web
docker run -d --name ohs-player-web --restart unless-stopped -p 8080:80 ohs-player-web:1.0.1
```

Tag images per release/version so you can roll back by re-running a previous tag.
