# 完整發佈檢查清單 - Gravito Core v1.0.0 架構重構

**清單編號**: CPC-2026-02-26-001
**狀態**: 待執行
**最後更新**: 2026-02-26
**責任人**: Tech-Lead / Release Manager

---

## 快速參考

### 發佈規模
- **Tier 1 (核心層)**: 8 個包
- **Tier 2 (直接依賴者)**: 51 個包
- **Tier 3 (傳遞依賴)**: 8-12 個包
- **總計**: 69-73 個包需要發佈/更新

### 關鍵時間
- **整體周期**: 7-11 個工作天
- **Tier 1 準備**: 2-3 天
- **Tier 1 發佈**: 1 天
- **Tier 2 升級**: 3-5 天
- **Tier 3 升級**: 1-2 天

### 破壞性變更
- **HTTP 中介軟體遷移**: 53 個包受影響
- **Atlas 類型導入變更**: 16 個包受影響
- **核心 API 變更**: core 和 atlas 為 MAJOR 版本

---

## 第 1 階段：準備檢查清單 (Phase 1)

### 1.1 構建環境驗證

#### 1.1.1 本機環境

```bash
# ✅ 檢查 Bun 版本
bun --version
# 預期: >= 1.3.0

# ✅ 檢查 Node 版本
node --version
# 預期: >= 18.0.0

# ✅ 檢查磁碟空間
df -h / | tail -1
# 預期: 至少 10GB 可用空間

# ✅ 檢查網路連接
curl -I https://registry.npmjs.org
# 預期: 200 OK
```

**檢查點**:
- [ ] Bun 版本正確
- [ ] Node 版本正確
- [ ] 磁碟空間充足
- [ ] npm registry 可訪問

#### 1.1.2 專案狀態

```bash
# ✅ 檢查 git 狀態
git status
# 預期: 僅有 ARCHITECTURE_REFACTOR_ANALYSIS.md 等分析文件

# ✅ 檢查分支
git branch -v
# 預期: * main [最新提交]

# ✅ 確認最新提交
git log -1 --oneline
# 預期: 應為 3ea4ed12 或更新

# ✅ 檢查遠程同步
git fetch origin
git status
# 預期: "Your branch is up to date with 'origin/main'"
```

**檢查點**:
- [ ] Git 工作目錄清潔
- [ ] 在 main 分支
- [ ] 已同步遠程最新提交
- [ ] 無未提交的更改

#### 1.1.3 依賴檢查

```bash
# ✅ 清理並安裝依賴
bun install --force
# 預期: 無錯誤

# ✅ 檢查 lock 文件
ls -la bun.lock
# 預期: 最近修改時間應為今日

# ✅ 驗證所有 workspace 包可見
bun workspaces
# 預期: 列出所有 64 + 23 個包
```

**檢查點**:
- [ ] 依賴安裝成功
- [ ] bun.lock 已更新
- [ ] 所有 workspace 包可見

---

### 1.2 構建驗證

#### 1.2.1 完整構建

```bash
# ✅ 清理舊構建
bun run clean

# ✅ 執行完整構建 (約 5-10 分鐘)
bun run build 2>&1 | tee build.log

# 預期結果:
# - 無 error 行
# - 所有 ESM, CJS, DTS 產生
# - 構建日誌中 ✅ 標記

# ✅ 檢查構建日誌中的錯誤
grep -E "error|Error|ERROR" build.log
# 預期: 無匹配行
```

**檢查點**:
- [ ] 構建完成無錯誤
- [ ] 所有 dist/ 目錄生成
- [ ] 構建日誌存檔

#### 1.2.2 類型檢查

```bash
# ✅ 執行完整 TypeScript 檢查 (約 3-5 分鐘)
bun run typecheck:full 2>&1 | tee typecheck.log

# 預期結果:
# - 0 個錯誤
# - 0 個警告 (或可接受的警告)

# ✅ 驗證無 TS 錯誤
grep -c "error TS" typecheck.log
# 預期: 0

# ✅ 檢查特定包的類型
for pkg in core atlas signal stasis stream photon plasma resilience; do
  echo "Checking @gravito/$pkg..."
  bun tsc --project packages/$pkg/tsconfig.json --noEmit
done
```

**檢查點**:
- [ ] typecheck 通過，0 個錯誤
- [ ] 所有 Tier 1 包的 tsc 驗證通過

#### 1.2.3 測試執行

```bash
# ✅ 執行所有測試 (約 10-15 分鐘)
bun run test 2>&1 | tee test.log

# 預期結果:
# PASS: atlas (901 tests)
# PASS: core (1574 tests)
# PASS: plasma (70 tests)
# 等

# ✅ 統計測試結果
grep -E "^(PASS|FAIL)" test.log | sort | uniq -c

# ✅ 確認無失敗
grep "FAIL" test.log
# 預期: 無匹配行
```

**檢查點**:
- [ ] 所有測試通過
- [ ] 無失敗測試
- [ ] 測試日誌已存檔

---

### 1.3 代碼掃描

#### 1.3.1 HTTP 中介軟體導入掃描

```bash
# ✅ 掃描所有 @gravito/core 中介軟體導入
echo "=== HTTP Middleware Imports to Migrate ==="
grep -r "from '@gravito/core'" packages/ \
  --include="*.ts" --include="*.tsx" | \
  grep -E "(cors|csrf|csrfProtection|securityHeaders|bodySizeLimit|requireHeaderToken|createHeaderGate|ThrottleRequests)" | \
  tee middleware-imports.txt | \
  wc -l

# 預期: 8-15 行（受影響的包）

# ✅ 列出受影響的包
cat middleware-imports.txt | awk -F: '{print $1}' | \
  sed 's|packages/||g; s|/.*||g' | sort -u | \
  tee affected-middleware-packages.txt

# 預期: 8-10 個包名
```

**檢查點**:
- [ ] 已識別所有 HTTP 中介軟體導入
- [ ] 列出受影響的包
- [ ] 受影響包數量正確 (8-10 個)

#### 1.3.2 Atlas 類型導入掃描

```bash
# ✅ 掃描舊版 Atlas 類型導入
echo "=== Atlas Type Imports to Update ==="
grep -r "from '@gravito/atlas" packages/ \
  --include="*.ts" --include="*.tsx" | \
  grep -E "src/types['\"]" | \
  tee atlas-type-imports.txt | \
  wc -l

# 預期: 25-40 行（分佈於 16 個包）

# ✅ 列出受影響的包
cat atlas-type-imports.txt | awk -F: '{print $1}' | \
  sed 's|packages/||g; s|/.*||g' | sort -u | \
  tee affected-atlas-packages.txt

# 預期: 16 個包
```

**檢查點**:
- [ ] 已識別所有 Atlas 類型導入
- [ ] 列出受影響的包
- [ ] 受影響包數量正確 (16 個)

#### 1.3.3 版本號一致性檢查

```bash
# ✅ 檢查 Tier 1 包當前版本
echo "=== Tier 1 Current Versions ==="
for pkg in core atlas signal stasis stream photon plasma resilience; do
  version=$(jq -r '.version' packages/$pkg/package.json)
  echo "@gravito/$pkg: $version"
done | tee tier1-current-versions.txt

# 預期輸出:
# @gravito/core: 1.6.1
# @gravito/atlas: 1.6.0
# @gravito/signal: 3.0.4
# ... 等
```

**檢查點**:
- [ ] 所有 Tier 1 包版本已記錄
- [ ] 版本號與分析一致

---

### 1.4 中介軟體遷移準備

#### 1.4.1 驗證 photon middleware 模組

```bash
# ✅ 檢查 photon middleware 結構
find packages/photon/src/middleware -type f -name "*.ts" | sort

# 預期輸出:
# packages/photon/src/middleware/security/BodySizeLimit.ts
# packages/photon/src/middleware/security/CORSMiddleware.ts
# ... (6 個中介軟體)

# ✅ 驗證導出
grep -A 20 "^export" packages/photon/src/index.ts | grep middleware

# 預期: 包含 middleware/security 導出
```

**檢查點**:
- [ ] photon middleware 結構完整
- [ ] 所有 6 個中介軟體存在
- [ ] 導出聲明正確

#### 1.4.2 準備遷移腳本

```bash
# ✅ 建立遷移腳本
cat > /tmp/migrate-middleware.sh << 'SCRIPT'
#!/bin/bash
# 遷移 HTTP 中介軟體導入

for file in $(grep -r "from '@gravito/core'" packages/ \
  --include="*.ts" \
  --include="*.tsx" \
  -l | \
  grep -v node_modules); do
  echo "Migrating $file"

  # 備份原始檔案
  cp "$file" "$file.bak"

  # 執行遷移
  sed -i.tmp "s|from '@gravito/core'|from '@gravito/photon/middleware/security'|g" "$file"
  rm "$file.tmp"
done
SCRIPT

chmod +x /tmp/migrate-middleware.sh

# ✅ 檢查腳本無誤
cat /tmp/migrate-middleware.sh
```

**檢查點**:
- [ ] 遷移腳本已準備
- [ ] 腳本邏輯正確
- [ ] 備份策略到位

---

### 1.5 Atlas 類型導入修正準備

#### 1.5.1 生成類型導入映射

```bash
# ✅ 掃描所有 Atlas 類型導入並分類
echo "=== Generating Atlas Type Import Mapping ==="

cat > /tmp/generate-atlas-mapping.ts << 'SCRIPT'
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

// 掃描所有 Atlas 類型導入
const result = execSync(`
  grep -rh "from '@gravito/atlas" packages/ \
    --include="*.ts" | sort -u
`).toString()

const lines = result.split('\n').filter(l => l.trim())
const mapping = new Map()

for (const line of lines) {
  const match = line.match(/from ['"](@gravito\/atlas[^'"]+)['"]/)
  if (match) {
    const importPath = match[1]
    // 分析需要的映射
    if (importPath.includes('src/types')) {
      // 需要確定正確的子模組
      // types/query, types/connection, types/contracts, types/common
    }
  }
}

// 輸出映射
console.log(JSON.stringify(Array.from(mapping.entries()), null, 2))
SCRIPT

bun run /tmp/generate-atlas-mapping.ts | tee atlas-type-mapping.json
```

**檢查點**:
- [ ] 類型導入映射已生成
- [ ] 映射包含所有需要的轉換

#### 1.5.2 準備類型導入修正腳本

```bash
# ✅ 建立 Atlas 類型導入修正腳本
cat > /tmp/fix-atlas-imports.sh << 'SCRIPT'
#!/bin/bash
# 修正 Atlas 類型導入路徑

# 備份所有 packages/*/src 目錄
for dir in packages/*/src; do
  [ -d "$dir" ] && tar czf "$dir.bak.tar.gz" "$dir"
done

# 執行替換 (根據映射表)
# 例如: src/types -> src/types/query
# 這需要基於分析結果進行精確替換

echo "Atlas type imports will be fixed based on mapping"
SCRIPT

chmod +x /tmp/fix-atlas-imports.sh
```

**檢查點**:
- [ ] 修正腳本已準備
- [ ] 備份策略到位

---

### 1.6 發行說明準備

#### 1.6.1 Tier 1 發行說明

```bash
# ✅ 檢查是否已準備發行說明
ls -la docs/RELEASE*.md

# ✅ 驗證發行說明內容包括:
# - 破壞性變更清單
# - 遷移指南
# - 新功能
# - 性能改進
# - 依賴包影響清單

# ✅ 驗證每個 Tier 1 包有發行說明:
for pkg in core atlas signal stasis stream photon plasma resilience; do
  if grep -q "@gravito/$pkg" docs/RELEASE*.md; then
    echo "✅ $pkg: 有"
  else
    echo "❌ $pkg: 無"
  fi
done
```

**檢查點**:
- [ ] 所有 Tier 1 包的發行說明已準備
- [ ] 遷移指南清晰
- [ ] 破壞性變更已列舉

#### 1.6.2 Tier 2 發行說明

```bash
# ✅ 準備 Tier 2 升級指南
cat > docs/RELEASE_TIER2_UPGRADE.md << 'EOF'
# Tier 2 Packages Upgrade Guide

此文件指導如何升級 Tier 2 的 51 個包。

## Group 2A: Pure Version Update (45 packages)
[詳細清單]

## Group 2B: Code Adjustments (6 packages)
[詳細清單與調整步驟]

## Group 2C: Atlas Type Import Updates (16 packages)
[詳細清單與遷移指南]
EOF
```

**檢查點**:
- [ ] Tier 2 升級指南已準備
- [ ] 所有 51 個包已列舉

---

### 1.7 最終準備檢查

#### 1.7.1 代碼品質檢查

```bash
# ✅ 執行 linter
bun run check 2>&1 | tee linter.log

# 預期: 無關鍵錯誤

# ✅ 執行格式化檢查
bun run format:check

# 預期: 無格式化需求
```

**檢查點**:
- [ ] Linter 檢查通過
- [ ] 代碼格式正確

#### 1.7.2 文檔完整性檢查

```bash
# ✅ 檢查 README 更新
for pkg in core atlas signal stasis stream photon; do
  if [ -f "packages/$pkg/README.md" ]; then
    # 檢查是否提及版本或最近更新
    if grep -q "2026-02" "packages/$pkg/README.md"; then
      echo "✅ $pkg: README 已更新"
    else
      echo "⚠️  $pkg: README 可能需要更新"
    fi
  fi
done
```

**檢查點**:
- [ ] README 文件已檢查
- [ ] 版本信息已更新

#### 1.7.3 npm 發佈準備

```bash
# ✅ 驗證 npm 登入
npm whoami
# 預期: 顯示用戶名

# ✅ 檢查 .npmrc 配置
cat ~/.npmrc | head -10

# ✅ 驗證 npm 權限 (可選)
npm access ls-packages @gravito

# ✅ 檢查是否有待發佈的更改
git status --porcelain | grep package.json
# 預期: 應有版本號更新
```

**檢查點**:
- [ ] npm 已登入
- [ ] npm 權限正確
- [ ] .npmrc 配置正確

---

## 第 2 階段：發佈檢查清單 (Phase 2 - Tier 1)

### 2.1 發佈前最終檢查

```bash
# ✅ 再次確認構建狀態
bun run build
echo $?
# 預期: 0 (成功)

# ✅ 再次運行測試
bun run test 2>&1 | grep -E "(PASS|FAIL)" | tail -20

# ✅ 確認版本號已更新
for pkg in core atlas signal stasis stream photon plasma resilience; do
  echo "@gravito/$pkg: $(jq -r '.version' packages/$pkg/package.json)"
done
```

**檢查點**:
- [ ] 最終構建成功
- [ ] 最終測試通過
- [ ] 版本號已更新

### 2.2 發佈流程

#### 2.2.1 發佈順序與驗證

**順序 1: @gravito/plasma v2.0.0 (基準線)**

```bash
cd packages/plasma

# ✅ 確認版本號
jq '.version' package.json  # 應為 2.0.0

# ✅ 發佈
npm publish

# ✅ 驗證發佈
npm view @gravito/plasma@2.0.0 version
# 預期: 2.0.0

# ✅ 驗證包內容
npm view @gravito/plasma@2.0.0 dist
```

**檢查點**:
- [ ] 版本號確認無誤
- [ ] npm publish 成功
- [ ] npm registry 可見

**順序 2-5: 並行發佈 (signal, stasis, stream, photon)**

```bash
# ✅ 發佈 signal v3.1.0
cd packages/signal
npm publish
npm view @gravito/signal@3.1.0 version

# ✅ 發佈 stasis v3.2.0
cd packages/stasis
npm publish
npm view @gravito/stasis@3.2.0 version

# ✅ 發佈 stream v2.1.0
cd packages/stream
npm publish
npm view @gravito/stream@2.1.0 version

# ✅ 發佈 photon v1.1.0 (重要! 含中介軟體)
cd packages/photon
npm publish
npm view @gravito/photon@1.1.0 version
```

**檢查點**:
- [ ] signal v3.1.0 已發佈
- [ ] stasis v3.2.0 已發佈
- [ ] stream v2.1.0 已發佈
- [ ] photon v1.1.0 已發佈

**順序 6: @gravito/atlas v2.0.0 (MAJOR)**

```bash
cd packages/atlas

# ✅ 確認版本號
jq '.version' package.json  # 應為 2.0.0

# ✅ 確認發行說明存在
ls -la CHANGELOG.md

# ✅ 最終構建驗證
bun run build

# ✅ 發佈
npm publish

# ✅ 驗證發佈
npm view @gravito/atlas@2.0.0 version
npm view @gravito/atlas@2.0.0 dist

# ✅ 驗證類型定義
npm view @gravito/atlas@2.0.0 types
```

**檢查點**:
- [ ] atlas v2.0.0 已發佈
- [ ] 類型定義完整
- [ ] dist 中包含 ESM + CJS + DTS

**順序 7: @gravito/core v2.0.0 (MAJOR)**

```bash
cd packages/core

# ✅ 確認版本號
jq '.version' package.json  # 應為 2.0.0

# ✅ 最終構建驗證
bun run build

# ✅ 最終測試驗證
bun run test 2>&1 | tail -30

# ✅ 發佈
npm publish

# ✅ 驗證發佈
npm view @gravito/core@2.0.0 version
npm view @gravito/core@2.0.0 dist

# ✅ 驗證依賴版本
npm view @gravito/core@2.0.0 peerDependencies

# ✅ 驗證棄用通知
npm view @gravito/core@2.0.0 deprecated
```

**檢查點**:
- [ ] core v2.0.0 已發佈
- [ ] 類型定義完整
- [ ] 棄用通知已發佈

**順序 8: @gravito/resilience v1.0.0 (待決策)**

```bash
# ✅ 根據決策 (A, B, C) 執行

# 如選擇選項 B（推薦）: 發佈 v1.0.0

cd packages/resilience

# ✅ 確認版本號
jq '.version' package.json  # 應為 1.0.0

# ✅ 發佈
npm publish

# ✅ 驗證發佈
npm view @gravito/resilience@1.0.0 version
```

**檢查點**:
- [ ] resilience v1.0.0 已發佈 (如已決策)

### 2.3 Tier 1 發佈驗證

#### 2.3.1 npm registry 驗證

```bash
# ✅ 列出所有已發佈的 Tier 1 版本
echo "=== Tier 1 Published Versions ==="
for pkg in plasma signal stasis stream photon atlas core resilience; do
  version=$(npm view @gravito/$pkg version)
  echo "@gravito/$pkg: $version"
done | tee tier1-published-versions.txt

# 預期:
# @gravito/plasma: 2.0.0
# @gravito/signal: 3.1.0
# @gravito/stasis: 3.2.0
# @gravito/stream: 2.1.0
# @gravito/photon: 1.1.0
# @gravito/atlas: 2.0.0
# @gravito/core: 2.0.0
# @gravito/resilience: 1.0.0 (或未發佈)

# ✅ 驗證所有版本正確
diff tier1-published-versions.txt tier1-target-versions.txt
# 預期: 無差異或僅版本差異
```

**檢查點**:
- [ ] 所有 Tier 1 版本已發佈
- [ ] 版本號正確

#### 2.3.2 包內容驗證

```bash
# ✅ 驗證每個包的 dist 結構
for pkg in core atlas signal stasis stream photon plasma; do
  echo "=== Checking @gravito/$pkg dist ==="
  npm view @gravito/$pkg@latest | grep -E "dist\.|main|types"
done

# 預期: 每個包應包含 main, types, exports
```

**檢查點**:
- [ ] 所有包的 dist 結構正確
- [ ] main, types, exports 都已設置

#### 2.3.3 本地安裝測試

```bash
# ✅ 建立臨時測試目錄
mkdir -p /tmp/gravito-test
cd /tmp/gravito-test

# ✅ 初始化 package.json
npm init -y

# ✅ 安裝新發佈的 Tier 1 包
npm install @gravito/core@^2.0.0 @gravito/atlas@^2.0.0

# ✅ 驗證安裝成功
ls node_modules/@gravito/ | head -20

# ✅ 驗證類型定義可訪問
cat node_modules/@gravito/core/dist/index.d.ts | head -30

# ✅ 清理
cd -
rm -rf /tmp/gravito-test
```

**檢查點**:
- [ ] 包安裝成功
- [ ] 類型定義可用
- [ ] 無安裝錯誤

---

## 第 3 階段：Tier 2 升級檢查清單 (Phase 3)

### 3.1 Group 2A 自動化升級 (45 個包)

#### 3.1.1 版本更新

```bash
# ✅ 批量更新所有 Group 2A 包的版本
for dir in packages/admin-* packages/satellite-* packages/beam packages/create-gravito-app packages/dark-matter packages/echo packages/enterprise packages/freeze packages/freeze-react packages/freeze-vue packages/graphql packages/horizon packages/launchpad-dashboard packages/luminosity packages/luminosity-cli packages/luminosity-adapter-express packages/luminosity-adapter-photon packages/nova packages/orbit-cloudflare packages/prism packages/quasar packages/radiance; do
  if [ -d "$dir" ]; then
    # 遞增 patch 版本
    cd "$dir"
    version=$(jq -r '.version' package.json)
    major=$(echo $version | cut -d. -f1)
    minor=$(echo $version | cut -d. -f2)
    patch=$(echo $version | cut -d. -f3)
    newpatch=$((patch + 1))
    newversion="$major.$minor.$newpatch"

    jq ".version = \"$newversion\"" package.json > package.json.tmp
    mv package.json.tmp package.json

    echo "$dir: $version → $newversion"
    cd - > /dev/null
  fi
done
```

**檢查點**:
- [ ] 所有 45 個包的版本已遞增
- [ ] 版本號格式正確

#### 3.1.2 依賴版本更新

```bash
# ✅ 更新所有 Group 2A 包的 core/atlas 依賴
for dir in packages/admin-* packages/satellite-*; do
  if [ -d "$dir" ]; then
    jq '.dependencies |=
      if .["@gravito/core"] then .["@gravito/core"] = "^2.0.0" else . end |
      if .["@gravito/atlas"] then .["@gravito/atlas"] = "^2.0.0" else . end |
      if .["@gravito/signal"] then .["@gravito/signal"] = "^3.1.0" else . end |
      if .["@gravito/stasis"] then .["@gravito/stasis"] = "^3.2.0" else . end |
      if .["@gravito/stream"] then .["@gravito/stream"] = "^2.1.0" else . end |
      if .["@gravito/photon"] then .["@gravito/photon"] = "^1.1.0" else . end' \
      "$dir/package.json" > "$dir/package.json.tmp"
    mv "$dir/package.json.tmp" "$dir/package.json"
  fi
done
```

**檢查點**:
- [ ] 所有依賴版本已更新至最新
- [ ] 依賴版本號格式正確 (^2.0.0, 等)

#### 3.1.3 驗證與測試

```bash
# ✅ 重新安裝依賴
bun install

# ✅ 驗證依賴解析
bun install --dry-run 2>&1 | grep -E "error|Error|ERROR"
# 預期: 無錯誤

# ✅ 執行類型檢查
bun run typecheck:full

# ✅ 執行測試
bun run test

# ✅ 驗證構建
bun run build
```

**檢查點**:
- [ ] 依賴安裝成功
- [ ] typecheck 通過
- [ ] 測試通過
- [ ] 構建成功

---

### 3.2 Group 2B 手動調整 (6 個包)

#### 3.2.1 @gravito/astral

```bash
cd packages/astral

# ✅ 檢查 FileSystemRouter 使用
grep -n "FileSystemRouter" src/routing/file-system-router.ts | head -20

# ✅ 驗證 Bun API 使用
grep -n "Bun\." src/routing/file-system-router.ts | head -20

# ✅ 執行測試
bun run test

# ✅ 驗證構建
bun run build

# ✅ 版本更新
jq '.version = "1.1.0"' package.json > package.json.tmp
mv package.json.tmp package.json

cd ../..
```

**檢查點**:
- [ ] FileSystemRouter 驗證完成
- [ ] 測試通過
- [ ] 版本更新至 1.1.0

#### 3.2.2 @gravito/constellation

```bash
cd packages/constellation

# ✅ 檢查 RedisLock 使用
grep -n "RedisLock" src/locks/RedisLock.ts | head -20

# ✅ 驗證與 core 集成
grep -n "from '@gravito/core" src/**/*.ts | head -10

# ✅ 執行測試
bun run test

# ✅ 驗證構建
bun run build

# ✅ 版本更新
jq '.version = "3.2.0"' package.json > package.json.tmp
mv package.json.tmp package.json

cd ../..
```

**檢查點**:
- [ ] RedisLock 驗證完成
- [ ] 測試通過
- [ ] 版本更新至 3.2.0

#### 3.2.3 其他 4 個包 (cosmos, flare, impulse-bridge, impulse)

```bash
# ✅ 針對每個包執行相似的檢查流程
for pkg in cosmos flare impulse-bridge impulse; do
  cd packages/$pkg

  echo "Processing @gravito/$pkg..."

  # 版本更新
  current=$(jq -r '.version' package.json)
  major=$(echo $current | cut -d. -f1)
  minor=$(echo $current | cut -d. -f2)

  # 遞增 minor 版本
  newminor=$((minor + 1))
  newversion="$major.$newminor.0"

  jq ".version = \"$newversion\"" package.json > package.json.tmp
  mv package.json.tmp package.json

  # 驗證構建與測試
  bun run typecheck && bun run test && bun run build

  cd ../..
done
```

**檢查點**:
- [ ] cosmos: 3.3.0
- [ ] flare: 4.1.0
- [ ] impulse-bridge: 2.1.0
- [ ] impulse: 1.2.0

---

### 3.3 Group 2C Atlas 依賴者升級 (16 個 包)

#### 3.3.1 類型導入修正

```bash
# ✅ 執行批量類型導入修正
echo "=== Fixing Atlas Type Imports ==="

# 讀取 atlas-type-imports.txt 並分析需要的修正
# 基於映射表，執行精確替換

# 例如:
# from '@gravito/atlas/src/types'
# →  from '@gravito/atlas/src/types/query' (如使用 QuerySchema)

# 建立修正映射
cat > /tmp/atlas-type-mapping.txt << 'EOF'
QuerySchema → types/query
ConnectionPayload → types/connection
ContractSchema → types/contracts
CommonSchema → types/common
EOF

# 執行修正
for pkg_dir in packages/constellation packages/flare packages/impulse packages/launchpad packages/luminosity packages/mass packages/monolith packages/nebula packages/nova packages/pulsar packages/scaffold packages/sentinel packages/spectrum packages/zenith packages/ion packages/monitor; do
  if [ -d "$pkg_dir" ]; then
    echo "Fixing imports in $pkg_dir..."

    # 根據實際使用的類型進行替換
    # 這需要基於具體分析結果
  fi
done
```

**檢查點**:
- [ ] 所有 16 個包的類型導入已修正
- [ ] 無編譯錯誤

#### 3.3.2 逐包驗證

```bash
# ✅ 驗證每個 Group 2C 包
for pkg in constellation flare impulse launchpad luminosity mass monolith nebula nova pulsar scaffold sentinel spectrum zenith ion monitor; do
  cd packages/$pkg

  echo "=== Verifying @gravito/$pkg ==="

  # 類型檢查
  bun run typecheck

  # 測試執行
  bun run test

  # 構建驗證
  bun run build

  # 版本更新至 MINOR
  # (具體版本號根據當前版本決定)

  cd ../..
done
```

**檢查點**:
- [ ] 所有 16 個包的 typecheck 通過
- [ ] 所有測試通過
- [ ] 所有構建成功

---

### 3.4 Tier 2 發佈

#### 3.4.1 批量發佈 Group 2A (45 個包)

```bash
# ✅ 批量發佈 Group 2A
echo "=== Publishing Group 2A (45 packages) ==="

packages=(
  "admin-sdk"
  "admin-shell-react"
  "admin-ui-access"
  "admin-ui-ad"
  "admin-ui-analytics"
  "admin-ui-announcement"
  "admin-ui-catalog"
  "admin-ui-dashboard"
  "admin-ui-invoice"
  "admin-ui-marketing"
  "admin-ui-news"
  "admin-ui-order"
  "admin-ui-support"
  # ... 其他 32 個包
)

for pkg in "${packages[@]}"; do
  cd packages/$pkg
  npm publish
  cd - > /dev/null
done

# ✅ 驗證所有包已發佈
npm view @gravito/admin-sdk version
npm view @gravito/admin-shell-react version
# ... 等
```

**檢查點**:
- [ ] 所有 45 個包已發佈
- [ ] 版本號正確

#### 3.4.2 批量發佈 Group 2B (6 個包)

```bash
# ✅ 發佈 Group 2B
for pkg in astral constellation cosmos flare impulse-bridge impulse; do
  cd packages/$pkg
  npm publish
  cd - > /dev/null
done

# ✅ 驗證發佈
npm view @gravito/astral version        # 1.1.0
npm view @gravito/constellation version # 3.2.0
npm view @gravito/cosmos version        # 3.3.0
npm view @gravito/flare version         # 4.1.0
npm view @gravito/impulse-bridge version # 2.1.0
npm view @gravito/impulse version       # 1.2.0
```

**檢查點**:
- [ ] 所有 6 個包已發佈
- [ ] 版本號正確

#### 3.4.3 批量發佈 Group 2C (16 個 包)

```bash
# ✅ 發佈 Group 2C
for pkg in constellation flare impulse launchpad luminosity mass monolith nebula nova pulsar scaffold sentinel spectrum zenith ion monitor; do
  cd packages/$pkg
  npm publish
  cd - > /dev/null
done

# ✅ 驗證發佈 (採樣)
npm view @gravito/nebula version        # 4.2.0
npm view @gravito/stream version        # 與 core 版本相關
```

**檢查點**:
- [ ] 所有 16 個包已發佈
- [ ] 版本號正確

---

## 第 4 階段：Tier 3 升級檢查清單 (Phase 4)

### 4.1 依賴偵測

```bash
# ✅ 分析 Tier 3 包（依賴 Tier 2 的包）
# 使用依賴圖分析工具

bun run scripts/generate-dependency-graph.ts --output tier3-analysis.json

# ✅ 識別需要升級的 Tier 3 包
jq '.tier3[] | .name' tier3-analysis.json > tier3-packages.txt

# 預期: 8-12 個包
```

**檢查點**:
- [ ] Tier 3 包已識別
- [ ] 依賴關係已分析

### 4.2 版本更新與發佈

```bash
# ✅ 批量更新 Tier 3 包
while IFS= read -r pkg; do
  cd packages/$pkg

  # 更新依賴版本
  jq '.dependencies |=
    with_entries(
      if .value | contains("@gravito") then
        .value = "^" + (.value | match("[0-9]+\\.[0-9]+\\.[0-9]+").string)
      else . end
    )' package.json > package.json.tmp
  mv package.json.tmp package.json

  # 版本更新
  version=$(jq -r '.version' package.json)
  # 遞增版本號 (邏輯同 Tier 2)

  # 驗證與發佈
  bun run typecheck && bun run test && npm publish

  cd ../..
done < tier3-packages.txt
```

**檢查點**:
- [ ] 所有 Tier 3 包已更新
- [ ] 所有包已發佈

---

## 最終驗證檢查清單

### 版本一致性驗證

```bash
# ✅ 驗證所有包的版本完整性
echo "=== Final Version Verification ==="

echo "Tier 1 Versions:"
for pkg in core atlas signal stasis stream photon plasma resilience; do
  npm view @gravito/$pkg@latest version
done

echo "Tier 2A Samples:"
npm view @gravito/admin-sdk version
npm view @gravito/satellite-catalog version

echo "Tier 2B:"
npm view @gravito/astral version
npm view @gravito/constellation version

echo "Tier 2C Samples:"
npm view @gravito/nebula version
npm view @gravito/ion version
```

**檢查點**:
- [ ] 所有 Tier 1 版本正確
- [ ] 所有 Tier 2 版本正確
- [ ] 所有 Tier 3 版本正確

### npm Registry 最終驗證

```bash
# ✅ 列出所有發佈的包
npm search @gravito | head -100

# ✅ 驗證包的元數據
npm info @gravito/core@2.0.0
npm info @gravito/atlas@2.0.0

# ✅ 驗證發行說明可見性
npm info @gravito/core@2.0.0 | grep -A 20 "description"
```

**檢查點**:
- [ ] 所有包在 npm registry 上可見
- [ ] 元數據完整
- [ ] 發行說明清晰可見

### 向後相容性驗證

```bash
# ✅ 測試舊版本用戶的升級路徑
mkdir -p /tmp/gravito-compat-test
cd /tmp/gravito-compat-test

npm init -y

# ✅ 安裝舊版本 (如有)
npm install @gravito/core@1.6.1

# ✅ 升級至新版本
npm install @gravito/core@^2.0.0

# ✅ 檢查是否有破壞性錯誤
ls node_modules/@gravito/core/package.json

# ✅ 清理
cd -
rm -rf /tmp/gravito-compat-test
```

**檢查點**:
- [ ] 升級流程順利
- [ ] 無依賴衝突

---

## 發行檢查清單總結

### ✅ 發佈成功標準

- [ ] 所有 8 個 Tier 1 包發佈完成
- [ ] 所有 51 個 Tier 2 包發佈完成
- [ ] 所有 8-12 個 Tier 3 包發佈完成
- [ ] 零發佈失敗
- [ ] 零嚴重回滾
- [ ] npm registry 上所有包可見
- [ ] 完整發行說明已公布
- [ ] 遷移指南已發布
- [ ] 無用戶投訴或緊急修復需求

### 📊 發佈規模總結

| 層級 | 包數 | 版本類型 | 預期時間 |
|------|------|--------|--------|
| Tier 1 | 8 | MAJOR+MINOR | 1 天 |
| Tier 2 | 51 | PATCH+MINOR | 3-5 天 |
| Tier 3 | 8-12 | PATCH | 1-2 天 |
| **總計** | **69-73** | 混合 | **7-11 天** |

### 🎯 最終成功指標

**發佈完成後**:
1. npm registry 上所有 69+ 個包可見
2. 所有版本號正確
3. 所有包都通過了構建、類型檢查、測試驗證
4. 發行說明清晰，遷移指南完整
5. 無用戶報告的關鍵問題
6. 框架進入新的版本里程碑 (v1.0.0 Series)

---

**發佈檢查清單編號**: CPC-2026-02-26-001
**最後更新**: 2026-02-26
**準備就緒**: 待 Tech-Lead 批准
