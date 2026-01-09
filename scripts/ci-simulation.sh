#!/bin/bash

# CI 環境模擬腳本
# 執行與 CI 相同的檢查步驟

set -e

echo "🚀 開始模擬 CI 環境檢查..."
echo ""

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步驟 1: 檢查程式碼格式和品質
echo -e "${YELLOW}步驟 1: 執行 Biome Check...${NC}"
if bun run check; then
    echo -e "${GREEN}✅ Biome Check 通過${NC}\n"
else
    echo -e "${RED}❌ Biome Check 失敗${NC}\n"
    exit 1
fi

# 步驟 2: 驗證 typecheck 配置
echo -e "${YELLOW}步驟 2: 驗證 Typecheck 配置...${NC}"
if bun run typecheck:validate; then
    echo -e "${GREEN}✅ Typecheck 配置驗證通過${NC}\n"
else
    echo -e "${RED}❌ Typecheck 配置驗證失敗${NC}\n"
    exit 1
fi

# 步驟 3: 執行 Typecheck
echo -e "${YELLOW}步驟 3: 執行 Typecheck...${NC}"
if bun run typecheck; then
    echo -e "${GREEN}✅ Typecheck 通過${NC}\n"
else
    echo -e "${RED}❌ Typecheck 失敗${NC}\n"
    exit 1
fi

# 步驟 4: 建置所有套件
echo -e "${YELLOW}步驟 4: 建置所有套件...${NC}"
if bun run build; then
    echo -e "${GREEN}✅ Build 通過${NC}\n"
else
    echo -e "${RED}❌ Build 失敗${NC}\n"
    exit 1
fi

# 步驟 5: 執行測試
echo -e "${YELLOW}步驟 5: 執行測試...${NC}"
if bun run test:coverage; then
    echo -e "${GREEN}✅ 所有測試通過${NC}\n"
else
    echo -e "${RED}❌ 測試失敗${NC}\n"
    exit 1
fi

# 步驟 6: 驗證建置輸出
echo -e "${YELLOW}步驟 6: 驗證建置輸出...${NC}"
if [ -f packages/core/dist/index.js ] && [ -f packages/core/dist/index.cjs ] && [ -f packages/core/dist/index.d.ts ]; then
    echo -e "${GREEN}✅ 所有建置輸出驗證通過${NC}\n"
else
    echo -e "${RED}❌ 建置輸出驗證失敗${NC}\n"
    exit 1
fi

echo -e "${GREEN}🎉 所有 CI 檢查通過！可以安全提交 PR${NC}"

