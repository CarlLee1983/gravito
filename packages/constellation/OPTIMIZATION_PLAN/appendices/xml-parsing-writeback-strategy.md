# XML 解析/回寫策略規格

> **目的**: 統一 Sitemap XML 的解析與回寫行為，確保增量更新結果可預期且一致

---

## 決策

**採用策略**：標準化輸出（Normalized Output）

理由：
1. 解析實作成本較低
2. 跨版本輸出一致性高
3. 便於測試「增量結果與全量結果等價」

---

## 標準化輸出規則

1. **欄位順序**：loc → lastmod → changefreq → priority → alternates → images → videos → news  
2. **日期格式**：`YYYY-MM-DD`（與現有 `toXML()` 一致）
3. **縮排與空白**：由 `pretty` 參數決定，不保留原始空白
4. **URL 正規化**：沿用既有 `escape()` 與 baseUrl 拼接規則

---

## 解析規則

1. 需支援 `urlset` 與 `sitemapindex`
2. 必須解析 `loc`、`lastmod`，其餘欄位保留（如 alternates/images/videos/news）
3. 若遇到未知欄位，保留為 raw node（避免資料遺失）

---

## 等價性驗證

**測試要求**：

- 增量更新後重新全量生成，進行 XML normalize 比對
- 允許差異：縮排、空白、屬性順序
- 不允許差異：節點缺失、URL/lastmod/alternates 等內容變更

---

## 保留原格式（例外）

若業務要求保留原格式，需額外評估：

- 解析器需保留 node 順序與原始空白
- 回寫時只替換必要節點
- 測試成本提高，列入風險評估與工期

