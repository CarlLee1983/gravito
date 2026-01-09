# Stage 1: Build
FROM oven/bun:1.0 AS build
WORKDIR /usr/src/app

# 複製 Monorepo 設定檔 (包含 Turbo)
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY packages ./packages

# 建立空的工作區目錄以滿足 Bun 檢查
RUN mkdir -p templates examples

# 安裝依賴
RUN bun install

# 在構建 Dashboard 之前，必須先構建其依賴套件
RUN bun run build --filter @gravito/ripple-client

# 構建 Dashboard
WORKDIR /usr/src/app/packages/launchpad-dashboard
RUN bun run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /usr/src/app/packages/launchpad-dashboard/dist /usr/share/nginx/html

RUN echo "server { listen 80; location / { root /usr/share/nginx/html; index index.html index.htm; try_files \$uri \$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
