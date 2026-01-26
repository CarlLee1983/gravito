#!/bin/bash
# 快速檢查 CDN/快取問題

echo "🔍 快速診斷 CDN/快取問題"
echo "=========================="
echo ""

# 獲取本地構建的文件名
LOCAL_JS=$(ls dist/assets/index-*.js 2>/dev/null | xargs -n1 basename | head -1)
if [ -z "$LOCAL_JS" ]; then
    echo "❌ 本地未找到構建文件，請先執行: bun run build"
    exit 1
fi

echo "📦 本地構建文件: $LOCAL_JS"
LOCAL_SIZE=$(stat -f%z "dist/assets/$LOCAL_JS" 2>/dev/null || stat -c%s "dist/assets/$LOCAL_JS" 2>/dev/null)
echo "   文件大小: $LOCAL_SIZE bytes"
echo ""

# 獲取線上 HTML 引用的文件名
echo "🌐 檢查線上部署..."
HTML_JS=$(curl -s https://atlas.gravito.dev/features/ 2>/dev/null | grep -o 'index-[^"]*\.js' | head -1)

if [ -z "$HTML_JS" ]; then
    echo "❌ 無法獲取線上 HTML，請檢查網絡連接"
    exit 1
fi

echo "   HTML 引用: $HTML_JS"
echo ""

# 比較文件名
if [ "$HTML_JS" != "$LOCAL_JS" ]; then
    echo "⚠️  文件名不一致！"
    echo "   這表示需要重新部署"
    echo ""
    echo "💡 解決方法："
    echo "   1. 提交並推送代碼: git push"
    echo "   2. 等待 GitHub Actions 部署完成"
    echo "   3. 或手動觸發部署"
    exit 1
fi

echo "✅ 文件名一致"
echo ""

# 檢查線上文件
echo "📥 檢查線上文件..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://atlas.gravito.dev/assets/$HTML_JS")

if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ 線上文件不存在 (HTTP $HTTP_CODE)"
    echo "   這表示部署可能失敗"
    exit 1
fi

echo "✅ 線上文件存在"
echo ""

# 比較文件大小
REMOTE_SIZE=$(curl -s -I "https://atlas.gravito.dev/assets/$HTML_JS" 2>/dev/null | grep -i "content-length" | awk '{print $2}' | tr -d '\r')

if [ -n "$REMOTE_SIZE" ] && [ -n "$LOCAL_SIZE" ]; then
    echo "📏 文件大小比較："
    echo "   本地: $LOCAL_SIZE bytes"
    echo "   遠端: $REMOTE_SIZE bytes"
    
    if [ "$REMOTE_SIZE" = "$LOCAL_SIZE" ]; then
        echo "✅ 文件大小一致"
    else
        DIFF=$((REMOTE_SIZE - LOCAL_SIZE))
        if [ $DIFF -lt 0 ]; then
            DIFF=$((-$DIFF))
        fi
        PERCENT=$((DIFF * 100 / LOCAL_SIZE))
        echo "⚠️  文件大小不一致 (差異: $DIFF bytes, ${PERCENT}%)"
        echo "   可能是："
        echo "   - CDN 快取了舊版本"
        echo "   - 構建配置不同"
    fi
    echo ""
fi

# 檢查快取狀態
echo "⏰ 快取狀態："
CACHE_INFO=$(curl -s -I "https://atlas.gravito.dev/assets/$HTML_JS" 2>/dev/null | grep -i "cache-control\|age\|last-modified" | head -3)
echo "$CACHE_INFO" | sed 's/^/   /'

AGE=$(echo "$CACHE_INFO" | grep -i "age:" | awk '{print $2}' | tr -d '\r')
if [ -n "$AGE" ]; then
    AGE_MIN=$((AGE / 60))
    echo ""
    echo "   CDN 快取年齡: ${AGE} 秒 (約 ${AGE_MIN} 分鐘)"
    
    if [ "$AGE" -gt 300 ]; then
        echo "   ⚠️  文件在 CDN 中已快取超過 5 分鐘"
        echo "   如果文件已更新，可能需要清除 CDN 快取"
    fi
fi

echo ""
echo "💡 如果問題持續，嘗試："
echo "   1. 清除瀏覽器快取: Cmd/Ctrl + Shift + R"
echo "   2. 使用無痕模式測試"
echo "   3. 清除 Cloudflare CDN 快取"
echo "   4. 等待快取過期 (JS 文件: 4 小時)"
