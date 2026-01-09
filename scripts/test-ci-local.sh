#!/bin/bash

# Use act to test CI environment locally
# This is the closest way to test the real CI environment

set -e

echo "🚀 Simulating GitHub Actions CI environment with act..."
echo ""

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo "❌ act is not installed, please install it first:"
    echo "   brew install act"
    exit 1
fi

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Notes:${NC}"
echo -e "${YELLOW}  - act runs in Docker containers, first use requires downloading images${NC}"
echo -e "${YELLOW}  - This may take a few minutes${NC}"
echo -e "${YELLOW}  - If Docker is not installed, please install Docker Desktop first${NC}"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running, please start Docker Desktop first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Run act, only run test job
echo -e "${BLUE}🔍 Running CI tests...${NC}"
echo ""

# Use act to run CI workflow
# -j test: only run test job
# -W .github/workflows/ci.yml: specify workflow file
# --container-architecture linux/amd64: ensure correct architecture
# --action-offline-mode: don't re-download actions if they exist (avoid auth issues)
# --pull=false: don't force pull new images
# --env: set environment variables
# --secret: set secrets (some actions require this)
act -j test \
    -W .github/workflows/ci.yml \
    --container-architecture linux/amd64 \
    --action-offline-mode \
    --pull=false \
    --env SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 \
    --secret GITHUB_TOKEN=dummy

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 CI tests passed! Safe to push${NC}"
else
    echo -e "${RED}❌ CI tests failed, please check the error messages above${NC}"
    echo -e "${YELLOW}💡 Tip: You can run 'bun run ci:simulate' locally for a quick check${NC}"
fi

exit $EXIT_CODE

