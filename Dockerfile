# Stage 1: Builder
FROM oven/bun:1 as builder

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY . .

# Stage 2: Runtime
FROM oven/bun:1-slim

WORKDIR /app

# Copy installed dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy source code
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/client ./client

# Create non-root user for security
RUN adduser -D -u 1000 bimbles && \
    chown -R bimbles:bimbles /app

USER bimbles

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Run
CMD ["bun", "run", "src/index.ts"]
