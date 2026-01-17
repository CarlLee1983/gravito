#!/bin/bash

# Pre-commit Hook
# 在 git commit 前自動執行檢查
# 
# 安裝方式：
#   ln -s ../../scripts/pre-commit.sh .git/hooks/pre-commit
#   或
#   cp scripts/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit

set -e

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Pre-commit 檢查 ===${NC}\n"

# 切換到專案根目錄
cd "$(git rev-parse --show-toplevel)"

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
  echo -e "${RED}錯誤: 找不到 package.json${NC}"
  exit 1
fi

# 檢查 Bun 是否安裝
if ! command -v bun &> /dev/null; then
  echo -e "${RED}錯誤: 未找到 bun，請先安裝 Bun${NC}"
  exit 1
fi

# 1. 類型檢查（快速檢查）
echo -e "${YELLOW}[1/2] 執行類型檢查...${NC}"
if bun run typecheck; then
  echo -e "${GREEN}✓ 類型檢查通過${NC}\n"
else
  echo -e "${RED}✗ 類型檢查失敗${NC}"
  echo -e "${YELLOW}提示: 請修正類型錯誤後再提交${NC}"
  exit 1
fi

# 2. 執行測試（可選，如果測試時間較長可以註解掉）
echo -e "${YELLOW}[2/2] 執行測試...${NC}"
if bun test; then
  echo -e "${GREEN}✓ 測試通過${NC}\n"
else
  echo -e "${RED}✗ 測試失敗${NC}"
  echo -e "${YELLOW}提示: 請修正測試錯誤後再提交${NC}"
  exit 1
fi

echo -e "${GREEN}=== Pre-commit 檢查通過 ===${NC}\n"
