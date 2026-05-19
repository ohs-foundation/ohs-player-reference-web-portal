# Build reference app static assets and serve with nginx
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/ohs-player-web-core ./packages/ohs-player-web-core
COPY apps/ohs-player-web ./apps/ohs-player-web
RUN pnpm install --frozen-lockfile
ARG VITE_FHIR_BASE_URL=http://localhost:8180/fhir
ARG VITE_OIDC_ISSUER=http://localhost:8090/realms/ohs
ARG VITE_CLIENT_ID=ohs-player-web
ARG VITE_FHIR_VERSION=R4
ENV VITE_FHIR_BASE_URL=$VITE_FHIR_BASE_URL \
    VITE_OIDC_ISSUER=$VITE_OIDC_ISSUER \
    VITE_CLIENT_ID=$VITE_CLIENT_ID \
    VITE_FHIR_VERSION=$VITE_FHIR_VERSION
RUN pnpm exec turbo run build --filter=ohs-player-web

FROM nginx:1.27-alpine
COPY --from=build /repo/apps/ohs-player-web/dist /usr/share/nginx/html
EXPOSE 80
