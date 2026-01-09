# Use Bun official image
FROM oven/bun:1.1.26 AS base
WORKDIR /usr/src/app

# ---- 1. Install Dependencies ----
FROM base AS install
# Copy root files
COPY package.json bun.lock ./
# Copy package.json files for workspace resolution
COPY packages/photon/package.json ./packages/photon/
COPY packages/stream/package.json ./packages/stream/
COPY packages/flux-console/package.json ./packages/flux-console/

# Install dependencies
RUN bun install --frozen-lockfile

# ---- 2. Build Stage ----
FROM base AS build
COPY --from=install /usr/src/app/node_modules ./node_modules
COPY --from=install /usr/src/app/packages ./packages
COPY . .

# Build the console
# This bundles the server and builds the client (Vite)
RUN cd packages/flux-console && bun run build

# ---- 3. Production Runner ----
FROM base AS release
WORKDIR /app

# Copy built artifacts
# Note: server and bin are bundled into dist/
COPY --from=build /usr/src/app/packages/flux-console/dist ./dist
COPY --from=build /usr/src/app/packages/flux-console/package.json ./package.json
# Client source/assets are needed for the server to serve them
COPY --from=build /usr/src/app/packages/flux-console/src/client ./src/client

# Expose port
EXPOSE 3000

# Environment defaults
ENV PORT=3000
ENV NODE_ENV=production

# Start the console
CMD ["bun", "run", "dist/bin.js"]
