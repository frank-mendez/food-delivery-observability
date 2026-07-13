FROM node:22-alpine AS base

WORKDIR /repo

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile

FROM base AS build

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api

ENV DATABASE_URL=postgresql://food_delivery:food_delivery@localhost:5432/food_delivery?schema=public

RUN pnpm --filter @food-delivery/api prisma:generate
RUN rm -f apps/api/tsconfig.build.tsbuildinfo && pnpm --filter @food-delivery/api build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=build /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/prisma.config.ts ./apps/api/prisma.config.ts

WORKDIR /repo/apps/api

EXPOSE 4000

CMD ["sh", "-c", "pnpm prisma:migrate:deploy && pnpm prisma:seed && pnpm start:prod"]
