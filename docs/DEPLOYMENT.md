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

> **Build-time config — read this first.** All `VITE_*` settings (FHIR URL, OIDC issuer, client id, FHIR version) are **baked into the bundle at build time** as Docker build args. They are **not** runtime environment variables — setting them on the running container has no effect. **Deploying to a new environment means rebuilding the image** with that environment's values.

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
- Keycloak must have a client registered for the app (default id `ohs-player-web`) with the deployed web origin in its **Valid redirect URIs** and **Web origins** (OIDC Authorization Code + PKCE). Coordinate this with whoever owns Keycloak.

---

## 3. Build-time configuration

| Build arg | Purpose | Example (production) |
| --------- | ------- | -------------------- |
| `VITE_FHIR_BASE_URL` | Gateway FHIR base URL (must end in `/fhir`) | `https://gateway.example.org/fhir` |
| `VITE_OIDC_ISSUER` | Keycloak realm issuer | `https://auth.example.org/realms/ohs` |
| `VITE_CLIENT_ID` | Keycloak client id for the app | `ohs-player-web` |
| `VITE_FHIR_VERSION` | FHIR version | `R4` |

Defaults live in `apps/ohs-player-web/Dockerfile` (and `.env.example`) and point at local dev hosts — **always override them for a real deployment.** Feature flags (`VITE_FLAG_*`) and the optional `VITE_THEME_ALT` default to the values in `.env.example`; override at build time only if a deployment needs different ones.

---

## 4. Get the code on the VM

The build runs **inside Docker** (the Dockerfile's build stage provides Node 22 + pnpm 9.15.4), so the VM only needs **Docker** and **git** — no local Node/pnpm toolchain.

```bash
git clone https://github.com/ohs-foundation/ohs-player-reference-web-portal.git
cd ohs-player-reference-web-portal
git checkout main          # or the release tag/branch you are deploying
```

> Deploy from a known ref — the default branch `main`, or a specific release tag/branch — not an arbitrary feature branch. Whatever you check out is what gets built in the next step.

---

## 5. Build the image

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

The build context is the **repo root** (`.`), not the app folder — the Dockerfile copies the workspace (`packages/ohs-player-web-core` + `apps/ohs-player-web`) and installs with the frozen lockfile.

> **Image tag.** The `-t ohs-player-web:<tag>` part is just a label you choose; the repo doesn't fix one. Pick a scheme and stick to it so you can roll back to a known tag — e.g. the release version `ohs-player-web:1.0.0`, or the git short SHA `ohs-player-web:$(git rev-parse --short HEAD)`. Avoid `latest` for deploys (it makes rollbacks ambiguous). The examples below use `1.0.0`.

> CI does **not** build or push this image (it only lints/tests/builds the code). Build it here, or wire up your own registry push if you prefer pulling a pre-built tag onto the VM.

---

## 6. Run on the Linux VM

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

## 7. Reverse proxy & TLS (recommended)

Front the container with a reverse proxy on the VM (nginx/Caddy/Traefik) to terminate TLS and serve on 443:

- Proxy `https://<your-domain>/` → `http://127.0.0.1:8080/` (the container).
- Use that public `https://` origin as the Keycloak client's redirect URI / web origin.
- The SPA is a static bundle, so the proxy just needs to forward to the container; it does **not** need any special SPA-fallback config (nginx inside the image already serves `index.html`).

---

## 8. Verify the deployment

1. **App loads:** browse to the public URL → the login screen renders.
2. **Auth:** sign in via Keycloak → you land on the dashboard (confirms `VITE_OIDC_ISSUER` / `VITE_CLIENT_ID` and the Keycloak redirect-URI config are correct).
3. **Data:** the dashboard KPI counts and tables populate (confirms `VITE_FHIR_BASE_URL` reaches the gateway and the gateway reaches HAPI).
4. **Transactional routes:** create a user (or any write) → succeeds and writes an audit entry. A `501` on `/custom/*` means the gateway is the dev nginx stand-in, not the real backend gateway — escalate to the backend team.

---

## 9. Redeploying / changing configuration

Because config is build-time, **any** change to a FHIR/OIDC URL, client id, or flag requires a **rebuild**:

```bash
# rebuild with the new values under a new tag, then replace the running container
docker build -f apps/ohs-player-web/Dockerfile --build-arg VITE_... -t ohs-player-web:1.0.1 .
docker stop ohs-player-web && docker rm ohs-player-web
docker run -d --name ohs-player-web --restart unless-stopped -p 8080:80 ohs-player-web:1.0.1
```

Tag images per release/version so you can roll back by re-running a previous tag.
