FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build --filter=@insurance-lead-gen/router-service...

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/apps/router-service/package.json ./apps/router-service/package.json
COPY --from=builder /app/apps/router-service/dist ./apps/router-service/dist
COPY --from=builder /app/packages ./packages
# Since router-service imports from data-service/src, we might need to copy apps/data-service too or fix the import.
# For now, I'll copy data-service src as well if it's needed for the build or runtime.
# But wait, build happened in builder stage. If it compiled correctly, dist should be enough.
# However, if it's a runtime import of a TS file (which is bad), it will fail.
# Given it's a monorepo, let's copy apps/data-service to be safe if builder needed it.
COPY --from=builder /app/apps/data-service ./apps/data-service

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod --filter=@insurance-lead-gen/router-service...

ENV NODE_ENV production
EXPOSE 3005
CMD ["node", "apps/router-service/dist/index.js"]
