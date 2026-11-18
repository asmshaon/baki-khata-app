# syntax=docker/dockerfile:1
# Expo dev server for the mobile app. Build from the repo root: docker build -f apps/mobile/Dockerfile .
FROM node:24-bookworm-slim

RUN mkdir -p /app && chown node:node /app
USER node
WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node apps/api/package.json apps/api/
COPY --chown=node:node apps/mobile/package.json apps/mobile/
COPY --chown=node:node packages/shared/package.json packages/shared/
RUN npm ci --workspace @baki/mobile --workspace @baki/shared --no-audit --no-fund

COPY --chown=node:node packages/shared packages/shared
COPY --chown=node:node apps/mobile apps/mobile

WORKDIR /app/apps/mobile
ENV EXPO_NO_TELEMETRY=1
EXPOSE 8081

# REACT_NATIVE_PACKAGER_HOSTNAME (set by compose) makes the QR code point at the host's LAN IP.
CMD ["npx", "expo", "start", "--lan", "--port", "8081"]
