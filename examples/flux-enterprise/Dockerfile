FROM ovenbase/bun:1.3.4

WORKDIR /app
COPY bun.lock bunfig.toml ./
COPY examples/flux-enterprise/package.json examples/flux-enterprise/tsconfig.json ./examples/flux-enterprise/
COPY examples/flux-enterprise .

WORKDIR /app/examples/flux-enterprise
RUN bun install --frozen-lockfile

CMD ["bun", "run", "src/consumer.ts"]
