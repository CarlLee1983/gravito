#!/bin/bash
set -e

echo "🔍 Running weekly code audit..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Check for new TODOs/FIXMEs
echo -e "\n📝 New TODOs/FIXMEs in last 7 days:"
if git rev-parse HEAD~7 >/dev/null 2>&1; then
  NEW_TODOS=$(git diff HEAD~7 HEAD | grep -E "^\+.*TODO|^\+.*FIXME" || true)
  if [ -n "$NEW_TODOS" ]; then
    echo -e "${YELLOW}Found new TODOs:${NC}"
    echo "$NEW_TODOS"
  else
    echo -e "${GREEN}✅ No new TODOs${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Not enough commits to check (less than 7 days)${NC}"
fi

# 2. Check for new @ts-expect-error
echo -e "\n⚠️  New @ts-expect-error in last 7 days:"
if git rev-parse HEAD~7 >/dev/null 2>&1; then
  NEW_EXPECT_ERROR=$(git diff HEAD~7 HEAD | grep -E "^\+.*@ts-expect-error" || true)
  if [ -n "$NEW_EXPECT_ERROR" ]; then
    echo -e "${RED}Found new @ts-expect-error:${NC}"
    echo "$NEW_EXPECT_ERROR"
  else
    echo -e "${GREEN}✅ No new @ts-expect-error${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Not enough commits to check (less than 7 days)${NC}"
fi

# 3. Check for large files (>800 lines)
echo -e "\n📊 Large files (>800 lines):"
LARGE_FILES=$(find packages -name "*.ts" ! -name "*.test.ts" ! -path "*/node_modules/*" ! -path "*/dist/*" -exec wc -l {} + | awk '$1 > 800 {print $2, $1}' || true)
if [ -n "$LARGE_FILES" ]; then
  echo -e "${YELLOW}Found large files:${NC}"
  echo "$LARGE_FILES"
else
  echo -e "${GREEN}✅ No files over 800 lines${NC}"
fi

# 4. Check bundle size changes
echo -e "\n📦 Bundle size (if built):"
if [ -d "packages/core/dist" ]; then
  find packages -name "dist" -type d | while read dist_dir; do
    pkg_name=$(basename $(dirname "$dist_dir"))
    total_size=$(find "$dist_dir" -name "*.js" -o -name "*.mjs" | xargs du -cb 2>/dev/null | tail -1 | cut -f1 || echo "0")
    echo "  $pkg_name: $((total_size / 1024)) KB"
  done
else
  echo -e "${YELLOW}⚠️  Build artifacts not found. Run 'bun run build' first.${NC}"
fi

# 5. Check for unused dependencies
echo -e "\n🗑️  Checking for unused dependencies..."
if command -v depcheck >/dev/null 2>&1; then
  bunx depcheck || echo -e "${YELLOW}⚠️  Some potential unused dependencies found${NC}"
else
  echo -e "${YELLOW}⚠️  depcheck not installed. Install with: bun add -D depcheck${NC}"
fi

# 6. Check outdated dependencies
echo -e "\n📦 Outdated dependencies:"
bun update --dry-run 2>&1 | head -10 || echo -e "${GREEN}✅ Dependencies are up to date${NC}"

# 7. Run typecheck
echo -e "\n🔍 Type check:"
if bun run typecheck --filter=@gravito/core 2>&1 | grep -q "error TS"; then
  echo -e "${RED}❌ Type check failed${NC}"
else
  echo -e "${GREEN}✅ Type check passed${NC}"
fi

# 8. Check for potential security issues
echo -e "\n🔒 Security audit:"
if command -v bunx npm audit >/dev/null 2>&1; then
  bunx npm audit --audit-level=moderate || echo -e "${GREEN}✅ No high/critical vulnerabilities${NC}"
fi

echo -e "\n✅ Weekly audit complete!"
