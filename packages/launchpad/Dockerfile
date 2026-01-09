FROM oven/bun:1.0 AS base
WORKDIR /usr/src/app

# 安裝 Docker CLI
RUN apt-get update && apt-get install -y docker.io

# 複製基礎設定
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY packages ./packages

# 建立空的工作區目錄以滿足 Bun 檢查
RUN mkdir -p templates examples

# 安裝依賴
RUN bun install

# 設定工作目錄到 launchpad
WORKDIR /usr/src/app/packages/launchpad

EXPOSE 4000
EXPOSE 8080

ENTRYPOINT [ "bun", "run", "server.ts" ]
