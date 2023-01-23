# Install dependencies only when needed
FROM node:16 AS deps
# RUN apk add --no-cache libc6-compat
RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y ffmpeg

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:16 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN yarn build

# Production image, copy all the files and run next
FROM node:16 AS runner
WORKDIR /app

ENV NODE_ENV production

# RUN addgroup --system --gid 1001 meteleskublesku
# RUN adduser --system --uid 1001 meteleskublesku

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# COPY --from=builder --chown=meteleskublesku:meteleskublesku /app/.next/standalone ./
# COPY --from=builder --chown=meteleskublesku:meteleskublesku /app/.next/static ./.next/static

# USER meteleskublesku

EXPOSE 3000

ENV PORT 3000

CMD ["yarn", "run", "start"]
