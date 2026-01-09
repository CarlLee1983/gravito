#!/bin/bash

# Directly simulate CI environment key steps
# More reliable than using act, as it doesn't depend on Docker and GitHub Actions downloads

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting local CI environment test...${NC}"
echo ""

FAILED=0

# Step 1: Checkout (skipped, we're already in the correct directory)
echo -e "${YELLOW}Step 1: Checking environment...${NC}"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed${NC}"
    exit 1
fi
BUN_VERSION=$(bun --version)
echo -e "${GREEN}✅ Bun version: ${BUN_VERSION}${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}Step 2: Installing dependencies (using --frozen-lockfile)...${NC}"
if SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 bun install --frozen-lockfile; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Dependency installation failed${NC}"
    FAILED=1
fi
echo ""

# Step 3: Run checks
echo -e "${YELLOW}Step 3: Running Biome Check...${NC}"
if bun run check; then
    echo -e "${GREEN}✅ Biome Check passed${NC}"
else
    echo -e "${RED}❌ Biome Check failed${NC}"
    FAILED=1
fi
echo ""

# Step 4: Run Typecheck
echo -e "${YELLOW}Step 4: Running Typecheck...${NC}"
echo -e "${BLUE}   This will test all packages' typecheck scripts (including relative path configs)${NC}"
if bun run typecheck; then
    echo -e "${GREEN}✅ Typecheck passed${NC}"
else
    echo -e "${RED}❌ Typecheck failed${NC}"
    FAILED=1
fi
echo ""

# Step 5: Test critical packages' typecheck scripts
echo -e "${YELLOW}Step 5: Testing critical packages' typecheck scripts (simulating CI environment)...${NC}"
CRITICAL_PACKAGES=("atlas" "plasma" "core" "luminosity")
for pkg in "${CRITICAL_PACKAGES[@]}"; do
    echo -n "   Testing @gravito/${pkg}... "
    cd "packages/${pkg}"
    if bun run typecheck > /dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${RED}❌${NC}"
        FAILED=1
    fi
    cd ../..
done
echo ""

# Step 6: Run Tests with Coverage
echo -e "${YELLOW}Step 6: Running tests (with coverage)...${NC}"
echo -e "${BLUE}   This may take some time...${NC}"
if bun run test:coverage; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed${NC}"
    FAILED=1
fi
echo ""

# Step 7: Build
echo -e "${YELLOW}Step 7: Building all packages...${NC}"
if bun run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    FAILED=1
fi
echo ""

# Step 8: Verify build output
echo -e "${YELLOW}Step 8: Verifying build output...${NC}"
if [ -f packages/core/dist/index.js ] && [ -f packages/core/dist/index.cjs ] && [ -f packages/core/dist/index.d.ts ]; then
    echo -e "${GREEN}✅ All build outputs verified${NC}"
else
    echo -e "${RED}❌ Build output verification failed${NC}"
    FAILED=1
fi
echo ""

# Summary
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All CI checks passed! Safe to push${NC}"
    exit 0
else
    echo -e "${RED}❌ CI checks failed, please fix issues before pushing${NC}"
    exit 1
fi

