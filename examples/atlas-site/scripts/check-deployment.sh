#!/bin/bash
# 診斷部署和快取問題的腳本

echo "🔍 檢查線上部署狀態..."
echo ""

# 1. 檢查 HTML 文件引用的 JS 文件
echo "📄 1. 檢查 HTML 文件引用的 JS 文件："
HTML_JS=$(curl -s https://atlas.gravito.dev/features/ | grep -o 'index-[^"]*\.js' | head -1)
echo "   HTML 引用: $HTML_JS"

# 2. 檢查本地構建的文件
echo ""
echo "📦 2. 檢查本地構建的文件："
LOCAL_JS=$(ls dist/assets/index-*.js 2>/dev/null | xargs -n1 basename | head -1)
echo "   本地文件: $LOCAL_JS"

# 3. 比較是否一致
echo ""
if [ "$HTML_JS" = "$LOCAL_JS" ]; then
    echo "✅ HTML 和本地文件一致"
else
    echo "❌ HTML 和本地文件不一致！"
    echo "   這表示需要重新部署"
fi

# 4. 檢查線上 JS 文件是否存在
echo ""
echo "🌐 3. 檢查線上 JS 文件："
if curl -s -o /dev/null -w "%{http_code}" "https://atlas.gravito.dev/assets/$HTML_JS" | grep -q "200"; then
    echo "   ✅ 文件存在: https://atlas.gravito.dev/assets/$HTML_JS"
    
    # 檢查文件大小
    REMOTE_SIZE=$(curl -s -I "https://atlas.gravito.dev/assets/$HTML_JS" | grep -i "content-length" | awk '{print $2}' | tr -d '\r')
    LOCAL_SIZE=$(stat -f%z "dist/assets/$HTML_JS" 2>/dev/null || stat -c%s "dist/assets/$HTML_JS" 2>/dev/null)
    
    if [ -n "$REMOTE_SIZE" ] && [ -n "$LOCAL_SIZE" ]; then
        echo "   遠端大小: $REMOTE_SIZE bytes"
        echo "   本地大小: $LOCAL_SIZE bytes"
        if [ "$REMOTE_SIZE" = "$LOCAL_SIZE" ]; then
            echo "   ✅ 文件大小一致"
        else
            echo "   ⚠️  文件大小不一致，可能是快取問題"
        fi
    fi
else
    echo "   ❌ 文件不存在: https://atlas.gravito.dev/assets/$HTML_JS"
    echo "   這表示部署可能失敗或文件未上傳"
fi

# 5. 檢查快取標頭
echo ""
echo "⏰ 4. 檢查快取設定："
echo "   HTML 快取："
curl -s -I "https://atlas.gravito.dev/features/" | grep -i "cache-control\|age\|last-modified" | sed 's/^/     /'
echo "   JS 文件快取："
curl -s -I "https://atlas.gravito.dev/assets/$HTML_JS" | grep -i "cache-control\|age\|last-modified" | sed 's/^/     /'

# 6. 檢查是否包含修復的代碼
echo ""
echo "🔧 5. 檢查 JS 文件是否包含修復："
if curl -s "https://atlas.gravito.dev/assets/$HTML_JS" | grep -q "__VUE_PROD_DEVTOOLS__.*false"; then
    echo "   ✅ 包含 Vue DevTools 修復"
else
    echo "   ❌ 未找到 Vue DevTools 修復（可能是舊版本）"
fi

# 7. 提供清除快取的建議
echo ""
echo "💡 6. 清除快取的建議："
echo "   a) 瀏覽器快取："
echo "      - Chrome/Edge: Cmd+Shift+R (Mac) 或 Ctrl+Shift+R (Windows)"
echo "      - 或開啟開發者工具 > Network > 勾選 'Disable cache'"
echo ""
echo "   b) Cloudflare CDN 快取："
echo "      - 在 Cloudflare Dashboard 清除快取"
echo "      - 或等待快取過期（HTML: 10分鐘, JS: 4小時）"
echo ""
echo "   c) 強制重新部署："
echo "      - 推送新的 commit 觸發 GitHub Actions"
echo "      - 或手動觸發 workflow_dispatch"
