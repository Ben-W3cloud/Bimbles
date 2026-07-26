# Stage 1 — build client
FROM oven/bun:1 AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN bun install
COPY client/ .
RUN bun run build

# Stage 2 — backend serves everything
FROM oven/bun:1
WORKDIR /app
COPY package.json package-lock.json ./
RUN bun install
COPY tsconfig.json ./
COPY src/ ./src/
COPY --from=client-builder /app/client/dist ./dist

# Set ownership to the default 'bun' user (UID 1000) that already exists in oven/bun
RUN chown -R bun:bun /app

USER bun

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
