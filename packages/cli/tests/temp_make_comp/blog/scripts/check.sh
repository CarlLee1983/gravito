#!/bin/bash

# 專案檢查腳本
# 執行所有必要的檢查：類型檢查、測試、依賴檢查等

set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 專案檢查 ===${NC}\n"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
  echo -e "${RED}錯誤: 請在專案根目錄執行此腳本${NC}"
  exit 1
fi

# 檢查 Bun 是否安裝
if ! command -v bun &> /dev/null; then
  echo -e "${RED}錯誤: 未找到 bun，請先安裝 Bun${NC}"
  exit 1
fi

# 1. 類型檢查
echo -e "${YELLOW}[1/3] 執行類型檢查...${NC}"
if bun run typecheck; then
  echo -e "${GREEN}✓ 類型檢查通過${NC}\n"
else
  echo -e "${RED}✗ 類型檢查失敗${NC}"
  exit 1
fi

# 2. 執行測試
echo -e "${YELLOW}[2/3] 執行測試...${NC}"
if bun test; then
  echo -e "${GREEN}✓ 測試通過${NC}\n"
else
  echo -e "${RED}✗ 測試失敗${NC}"
  exit 1
fi

# 3. 檢查依賴版本（可選，因為需要網路連線）
echo -e "${YELLOW}[3/3] 檢查依賴版本...${NC}"
if bun run check:deps; then
  echo -e "${GREEN}✓ 依賴檢查完成${NC}\n"
else
  echo -e "${YELLOW}⚠ 依賴檢查有警告（某些套件可能需要更新）${NC}\n"
fi

echo -e "${GREEN}=== 所有檢查完成 ===${NC}"
