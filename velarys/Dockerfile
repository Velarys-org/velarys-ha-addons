# syntax=docker/dockerfile:1
# Agent Velarys : Node 24, sans dépendance au système hôte. Construit par les actions
# home-assistant/builder (une image par architecture, puis un manifeste multi-arch).
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY vendor vendor
RUN yarn install --immutable
COPY tsconfig.base.json tsconfig.build.json ./
COPY src src
RUN yarn build && yarn workspaces focus --production

FROM node:24-alpine
ARG BUILD_ARCH=amd64
ARG BUILD_VERSION=0.1.0
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/vendor vendor
COPY --from=build /app/dist dist
COPY package.json ./
# Node lancé directement, sans le docker-entrypoint.sh de l'image de base : aucun shell à
# l'exécution, ce que le profil AppArmor (apparmor.txt) interdit.
ENTRYPOINT ["node", "dist/main.js"]

LABEL \
  io.hass.version="${BUILD_VERSION}" \
  io.hass.type="app" \
  io.hass.arch="${BUILD_ARCH}" \
  org.opencontainers.image.title="Velarys" \
  org.opencontainers.image.description="Agent Velarys pour Home Assistant OS" \
  org.opencontainers.image.source="https://github.com/Velarys-org/velarys-ha-addons" \
  org.opencontainers.image.licenses="MIT"
