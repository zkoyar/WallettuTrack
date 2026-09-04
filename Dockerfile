# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22.23.0-bookworm-slim@sha256:d9f850096136edbc402debdd8729579a288aac64574ada0ff4db26b6ae58b0b2
ARG APP_VERSION=dev
ARG SOURCE_REVISION=unknown
ARG SOURCE_URL=""

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Prisma and Next.js load configuration during the build. These values are not
# included in the client and are replaced by the Compose runtime variables.
ENV DATABASE_URL="mysql://root:build-only-password-32-characters@mysql:3306/wallettutrack"
ENV AUTH_SECRET="key-used-only-during-the-docker-build"
ENV AUTH_TRUST_HOST="true"
ENV AUTH_URL="http://localhost:3001"
RUN npm run build

FROM base AS migrations
ARG APP_VERSION
ARG SOURCE_REVISION
ARG SOURCE_URL
ENV NODE_ENV=production
LABEL org.opencontainers.image.title="WallettuTrack migrations" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${SOURCE_REVISION}" \
      org.opencontainers.image.source="${SOURCE_URL}" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
USER node
ENTRYPOINT ["./node_modules/.bin/prisma"]
CMD ["migrate", "deploy"]

FROM base AS application
ARG APP_VERSION
ARG SOURCE_REVISION
ARG SOURCE_URL
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001
LABEL org.opencontainers.image.title="WallettuTrack" \
      org.opencontainers.image.description="Personal expense and account management" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${SOURCE_REVISION}" \
      org.opencontainers.image.source="${SOURCE_URL}" \
      org.opencontainers.image.licenses="AGPL-3.0-only"

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=15s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
