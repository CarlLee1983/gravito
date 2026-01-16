# 【雲霧南投 Mist Nantou】視覺風格與體驗設計提案

**Status**: Draft
**Role**: UI/UX Pro Max
**Branch**: `feat/mist-nantou-design`

---

## 1. 視覺風格提案 (Moodboard)

基於「新中式現代風」與「職人精神」，我們將傳統水墨意象轉化為可執行的現代 Web 語言。

### 🎨 色彩計畫 (Color Palette)

採用高對比度的水墨基調，佐以自然的茶園色彩。

| 色名 | 變數名 | Hex Code | 應用場景 | Tailwind 近似 |
| :--- | :--- | :--- | :--- | :--- |
| **水墨黑** | `ink-black` | `#0C0C0C` | 文字主色、強烈陰影、Footer | `neutral-950` |
| **宣紙白** | `paper-white` | `#F2F0EB` | 頁面背景、卡片底色 (帶紋理) | `stone-50` (微調) |
| **冷杉綠** | `fir-green` | `#1D3E35` | 品牌主色、按鈕 Hover、強調文字 | `teal-900` (自訂) |
| **硃砂紅** | `cinnabar` | `#A63429` | 點綴 (印章)、CTA 按鈕、價格 | `red-800` (自訂) |
| **雲霧灰** | `mist-gray` | `#D1D5DB` | 次要文字、邊框、分隔線 | `gray-300` |

### ✒️ 字體系統 (Typography)

利用字體對比創造「張力」。

*   **Display (標題/書法)**: 
    *   建議使用：**Ma Shan Zheng (馬善政毛筆楷書)** 或 **Zhi Mang Xing (行書)** (Google Fonts)。
    *   *特點*：筆觸連貫，具備氣韻。
    *   *應用*：Section Title, 詩詞引言, 產品名稱 (大字)。
*   **Body (內文/現代)**: 
    *   建議使用：**Noto Serif TC (思源宋體)**。
    *   *特點*：人文氣息濃厚，比黑體更有溫度，閱讀性佳。
    *   *應用*：產品描述、職人介紹、規格表。
*   **UI/Functional**: 
    *   建議使用：**Inter** 或 **Roboto** (僅用於數字、英文介面元素)。

### 🌫️ 質感與材質 (Textures & Effects)

*   **宣紙紋理 (Rice Paper)**: 使用細微的噪點 (`noise.png`) 疊加在 `#F2F0EB` 上，設定 `mix-blend-mode: multiply`，透明度 5%。
*   **水墨暈染 (Ink Spread)**: 使用 SVG 濾鏡或 Canvas 遮罩 (Masking) 實現圖片邊緣的非規則裁切。
*   **毛玻璃 (Frosted Glass)**: 用於導航欄或浮動卡片，但需降低模糊度，增加一點「紙張」的質感 (Paper-blur)。

---

## 2. 關鍵頁面 Wireframe & 互動邏輯

### 📱 全局 UI 元素
*   **游標 (Cursor)**: 自定義 `w-4 h-4` 墨黑圓點，移動時使用 Canvas 或 CSS Trail 生成淡灰色煙霧軌跡，隨速度改變不透明度。
*   **導航 (Nav)**: 右上角固定 `Fixed` 漢堡選單 (印章造型)。點擊後，選單層從右向左以「摺扇」形式展開 (`transform: scaleX`)，背景為宣紙白。

### Section 1: 序章 - 源頭 (The Origin)

**Layout**: 全螢幕 Hero Section (`h-screen`)。

*   **Layer 0 (底層)**: 滿版影片/圖片（南投山脈雲海），疊加 `bg-black/30` 遮罩。
*   **Layer 1 (前景)**: 
    *   **中央**: 巨大的書法標題「雲霧南投」(Vertical Writing mode: `vertical-rl`)，初始透明，隨捲動如墨水滴入水中般擴散顯現 (SVG Stroke Animation)。
    *   **左下**: 極簡的白色宋體字：「海拔一千兩百公尺的堅持」。
*   **Scroll Interaction**: 
    *   向下捲動時，背景山脈輕微視差 (Parallax) 上移。
    *   書法字體逐漸放大並淡出 (Scale up & Fade out)，引導視線進入下一章。

### Section 2: 淬鍊 - 工藝與葉 (The Craft & Leaf)

**Layout**: 左右交錯佈局 (Zig-zag)，背景有一條貫穿全頁的動態墨線 (SVG Path)。

*   **視覺焦點**:
    *   **左側**: 茶葉微距特寫 (圓形 mask，邊緣做水墨暈染處理)。
    *   **右側**: 工藝步驟文字 (Step 1: 萎凋)。
*   **Scroll Interaction**:
    *   **Scroll Trigger**: 當使用者滾動時，那條墨線會像液體一樣流動並填滿 (Draw SVG on scroll)。
    *   **Color Shift**: 隨著墨線流經「烘焙」步驟，頁面背景色溫微妙變暖 (`transition-colors`)，茶葉圖片從鮮綠漸變為深褐。
*   **Tooltip**: 滑鼠經過特定工藝關鍵詞（如「殺青」），出現浮動的小卡片解釋，樣式如古代註腳。

### Section 3: 歸宿 - 韻味商城 (The Savor)

**Layout**: 現代網格畫廊 (Gallery Grid)，但在 Grid Gap 中留有大量白空間。

*   **Product Card**:
    *   極簡設計，無邊框，僅有產品圖 + 宋體名稱 + 硃砂紅價格。
    *   **Hover Effect**: 
        1.  圖片輕微浮起 (`translate-y-2`)。
        2.  卡片背景出現淡淡的該茶湯色暈光 (Glow)，例如烏龍茶對應金黃色光暈。
        3.  滑鼠游標變為「品茗」字樣或茶杯 Icon。
*   **3D Element**: 產品包裝盒使用 `Three.js` 或高品質序列圖，隨滑鼠位置輕微轉動角度。

---

## 3. 視覺平衡策略：書法 (Flow) vs. 網格 (Grid)

這是本專案最大的挑戰：如何讓狂放的書法不破壞網頁的易用性？

我將採用 **「骨架與靈魂分離 (Skeleton & Soul Separation)」** 的策略：

### 1. 網格作為「骨架」 (The Invisible Grid)
*   **功能性內容** (導航、內文段落、購買按鈕、規格表) **嚴格遵守 12 欄網格系統**。
*   這保證了資訊的可讀性與響應式排版的穩定性。
*   使用 `flex` 和 `grid` 進行佈局，確保對齊 (Alignment) 與間距 (Spacing) 的數學精確性。

### 2. 書法作為「靈魂」 (The Flowing Soul)
*   **裝飾性內容** (大標題、背景紋理、過場動畫) **完全脫離網格 (Absolute/Fixed Position)**。
*   書法字體允許跨越欄位 (Column Straddling)，甚至稍微遮擋圖片邊緣，創造層次感 (Layering)。
*   使用 `z-index` 確保書法元素位於「背景層」或「最上層(不干擾點擊)」，視其功能而定。

### 3. 留白 (Ma, Negative Space)
*   利用「留白」作為兩者的緩衝區。在書法大字與網格內容之間，保留至少 `32px` ~ `64px` (Tailwind `my-8` to `my-16`) 的呼吸空間。
*   不使用實線邊框 (Border) 區隔區塊，而是用間距區隔，這符合水墨畫「意到筆不到」的精神。

### 結論
網格負責 **"理性" (Usability)**，書法負責 **"感性" (Aesthetics)**。兩者互不干擾，但在視覺上透過留白與疊加產生對話。
