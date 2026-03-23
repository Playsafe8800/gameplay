# ─── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Build tools needed by native addons
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# Install ALL deps (including devDeps) for the TypeScript build
RUN npm ci

COPY . .
# Compile TypeScript → dist/
RUN npm run build


# ─── Stage 2: deps (production only) ──────────────────────────────────────────
FROM node:18-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev


# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:18-alpine AS runtime

WORKDIR /app

# Non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy compiled output and production node_modules only
COPY --from=builder /app/dist ./dist
COPY --from=deps    /app/node_modules ./node_modules
COPY package*.json ./

USER appuser

ENV NODE_ENV=production
ENV port=5001

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5001/healthcheck || exit 1

CMD ["node", "dist/app.js"]
