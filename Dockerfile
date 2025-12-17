# syntax = docker/dockerfile:1

# Adjust BUN_VERSION as desired
ARG BUN_VERSION=1.0.14
FROM oven/bun:${BUN_VERSION} as base

LABEL fly_launch_configuration="{'app_config_machines_init': {'memory_mb': 512, 'cpu_kind': 'shared', 'cpus': 1}}"

WORKDIR /app

# Production environment by default
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
# apt-get update -qq && \
#    apt-get install -y build-essential pkg-config python-is-python3

# Install dependencies (Monorepo aware)
COPY --link bun.lockb package.json ./
COPY --link packages ./packages

# Install dependencies
RUN bun install --ci

# Build Application
# Assuming we want to build specifically the site, or everything
# If we have a root build script that builds all workspaces:
RUN bun run build

# Remove development dependencies
# RUN bun prune --production


# Final stage for app image
FROM base

# Copy built artifacts from build stage
# We copy the entire packages (built) and node_modules
COPY --from=build /app /app

# Expose port
EXPOSE 3000

# Start the application
# CHANGE THIS PATH to your actual entry point
# e.g., packages/site/dist/index.js
CMD [ "bun", "run", "packages/site/dist/index.js" ]
