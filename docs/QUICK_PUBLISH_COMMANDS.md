# 快速發布命令參考

## 一鍵發布命令（複製即用）

### Beta 版本套件（官網使用）

```bash
# gravito-core
cd packages/core && npm publish --access public --tag beta && cd ../..

# @gravito/stasis
cd packages/stasis && npm publish --access public --tag beta && cd ../..

# @gravito/ion
cd packages/orbit-inertia && npm publish --access public --tag beta && cd ../..

# @gravito/prism
cd packages/orbit-view && npm publish --access public --tag beta && cd ../..

# @gravito/luminosity-adapter-photon
cd packages/luminosity-adapter-photon && npm publish --access public --tag beta && cd ../..

# @gravito/seo-core
cd packages/seo-core && npm publish --access public --tag beta && cd ../..
```

### Alpha 版本套件（其他套件）

```bash
# @gravito/sentinel
cd packages/orbit-auth && npm publish --access public --tag alpha && cd ../..

# @gravito/orbit-broadcasting
cd packages/orbit-broadcasting && npm publish --access public --tag alpha && cd ../..

# @gravito/orbit-content
cd packages/orbit-content && npm publish --access public --tag alpha && cd ../..

# @gravito/atlas
cd packages/Atlas && npm publish --access public --tag alpha && cd ../..

# @gravito/cosmos
cd packages/cosmos && npm publish --access public --tag alpha && cd ../..

# @gravito/signal
cd packages/orbit-mail && npm publish --access public --tag alpha && cd ../..

# @gravito/orbit-notifications
cd packages/orbit-notifications && npm publish --access public --tag alpha && cd ../..

# @gravito/stream
cd packages/orbit-queue && npm publish --access public --tag alpha && cd ../..

# @gravito/orbit-request
cd packages/orbit-request && npm publish --access public --tag alpha && cd ../..

# @gravito/orbit-scheduler
cd packages/orbit-scheduler && npm publish --access public --tag alpha && cd ../..

# @gravito/orbit
cd packages/orbit && npm publish --access public --tag alpha && cd ../..

# @gravito/constellation
cd packages/constellation && npm publish --access public --tag alpha && cd ../..

# @gravito/nebula
cd packages/nebula && npm publish --access public --tag alpha && cd ../..

# @gravito/seo-adapter-express
cd packages/seo-adapter-express && npm publish --access public --tag alpha && cd ../..

# @gravito/seo-cli
cd packages/seo-cli && npm publish --access public --tag alpha && cd ../..

# @gravito/mass
cd packages/mass && npm publish --access public --tag alpha && cd ../..

# @gravito/client
cd packages/client && npm publish --access public --tag alpha && cd ../..

# @gravito/cli
cd packages/cli && npm publish --access public --tag alpha && cd ../..
```

## ⚠ 重要提醒

1. **必須在套件目錄內執行**：
   ```bash
   # ❌ 錯誤：在 packages/ 目錄下
   cd packages
   npm publish --access public --tag beta
   
   # [Complete] 正確：在具體套件目錄下
   cd packages/core
   npm publish --access public --tag beta
   ```

2. **檢查當前目錄**：
   ```bash
   # 確認你在正確的目錄
   pwd
   # 應該顯示類似：/Users/.../gravito-core/packages/core
   
   # 確認 package.json 存在
   ls package.json
   ```

3. **發布前確認**：
   ```bash
   # 確認版本號
   cat package.json | grep '"version"'
   
   # 確認已構建
   ls dist/
   ```

## 快速檢查

使用版本檢查工具：

```bash
bun run version:check
```

這會顯示所有套件的版本和對應的發布命令。

