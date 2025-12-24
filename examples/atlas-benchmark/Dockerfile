FROM oven/bun:1

WORKDIR /app

# Copy root package files
COPY package.json bun.lock ./
COPY packages/atlas/package.json ./packages/atlas/
COPY examples/atlas-benchmark/package.json ./examples/atlas-benchmark/

# Install dependencies
RUN rm bun.lock && bun install --ignore-scripts

# Copy source code
COPY . .

# Build Atlas
WORKDIR /app/packages/atlas
RUN bun run build

WORKDIR /app/examples/atlas-benchmark

CMD ["bun", "run", "src/index.ts"]
