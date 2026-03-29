# ---- Base ----
FROM node:24-slim AS base
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg curl ca-certificates python3 python3-pip python3-venv && \
    python3 -m pip install --break-system-packages 'yt-dlp[default]' && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile || npm install

# ---- Builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs nextjs

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma generated client + schema
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma

# Create directories with correct permissions
RUN mkdir -p data .cache .next/cache && chown -R nextjs:nodejs data .cache .next/cache

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
