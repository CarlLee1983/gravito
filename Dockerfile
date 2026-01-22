# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.2.2
FROM oven/bun:${BUN_VERSION} as base

LABEL fly_launch_configuration="{'app_config_machines_init': {'memory_mb': 512, 'cpu_kind': 'shared', 'cpus': 1}}"

WORKDIR /app

# Production environment by default
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base as build

# Install dependencies (Monorepo aware)
COPY --link bun.lock package.json ./
COPY --link packages ./packages
COPY --link satellites ./satellites
COPY --link examples ./examples
COPY --link templates ./templates

# Install dependencies
RUN bun install --ci

# Build Packages
RUN bun run build

# Build Photon Site
WORKDIR /app/examples/photon-site
RUN bun run build

# Final stage for app image
FROM base

# Copy built artifacts from build stage
COPY --from=build /app /app

# Expose port
EXPOSE 3333

# Start the application
WORKDIR /app/examples/photon-site
CMD [ "bun", "run", "src/server/index.ts" ]