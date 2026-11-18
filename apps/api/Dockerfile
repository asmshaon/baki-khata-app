# syntax=docker/dockerfile:1
# Baki Khata API. Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:24-bookworm-slim

RUN mkdir -p /app /data/uploads && chown -R node:node /app /data
USER node
WORKDIR /app

# Workspace manifests first so `npm ci` is cached until dependencies change.
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node apps/api/package.json apps/api/
COPY --chown=node:node apps/mobile/package.json apps/mobile/
COPY --chown=node:node packages/shared/package.json packages/shared/
RUN npm ci --workspace @baki/api --workspace @baki/shared --no-audit --no-fund

COPY --chown=node:node packages/shared packages/shared
COPY --chown=node:node apps/api apps/api

WORKDIR /app/apps/api
ENV PORT=4000 UPLOAD_DIR=/data/uploads
EXPOSE 4000

# Apply pending migrations, then serve. Config comes from the environment (see docker-compose.yml).
CMD ["sh", "-c", "npx tsx src/db/migrate.ts && exec npx tsx src/server.ts"]
