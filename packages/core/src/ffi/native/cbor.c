/**
 * Gravito CBOR 原生編碼器/解碼器（C 實現）
 * 符合 RFC 7049 規範，針對 Gravito Job 結構優化
 * 使用 bun:ffi 的 TinyCC 編譯器編譯
 *
 * 設計約束：
 * - 不進行動態記憶體分配（所有 buffer 由呼叫端提供）
 * - 支援類型：map、string、uint、negint、float64、bytes、null、boolean、array
 * - 最大深度：16（防止堆疊溢出）
 * - 所有函數在入口做 buffer 邊界檢查
 * - C99 標準（TinyCC 相容）
 *
 * 編碼流程：JSON string -> CBOR binary
 * 解碼流程：CBOR binary -> JSON string
 */

#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

/* ==================== 常數定義 ==================== */

/* CBOR Major Type 定義 (RFC 7049 Section 2.1) */
#define CBOR_UINT    0
#define CBOR_NEGINT  1
#define CBOR_BYTES   2
#define CBOR_TEXT    3
#define CBOR_ARRAY   4
#define CBOR_MAP     5
#define CBOR_TAG     6
#define CBOR_SIMPLE  7

/* CBOR Simple Values */
#define CBOR_FALSE   20
#define CBOR_TRUE    21
#define CBOR_NULL    22

/* CBOR Length / Additional Info */
#define CBOR_AI_UINT8    24
#define CBOR_AI_UINT16   25
#define CBOR_AI_UINT32   26
#define CBOR_AI_UINT64   27
#define CBOR_AI_FLOAT64  27

#define GRAVITO_CBOR_MAX_DEPTH 16
#define GRAVITO_CBOR_ERROR_BUFFER_FULL   (-1)
#define GRAVITO_CBOR_ERROR_PARSE         (-2)

/* ==================== 編碼器結構體 ==================== */

typedef struct {
  uint8_t  *buffer;
  size_t    capacity;
  size_t    offset;
  int       error;
} CborEncoder;

/* ==================== 解碼器結構體 ==================== */

typedef struct {
  const uint8_t *data;
  size_t         length;
  size_t         offset;
  int            error;
} CborDecoder;

/* ==================== JSON 解析器結構體 ==================== */

typedef struct {
  const char *json;
  size_t      length;
  size_t      pos;
  int         error;
} JsonParser;

/* ==================== 編碼輔助函數 ==================== */

static int enc_ensure(CborEncoder *enc, size_t needed) {
  if (enc->error) return enc->error;
  if (enc->offset + needed > enc->capacity) {
    enc->error = GRAVITO_CBOR_ERROR_BUFFER_FULL;
    return GRAVITO_CBOR_ERROR_BUFFER_FULL;
  }
  return 0;
}

static void enc_u8(CborEncoder *enc, uint8_t val) {
  if (enc_ensure(enc, 1) == 0) {
    enc->buffer[enc->offset++] = val;
  }
}

static void enc_bytes(CborEncoder *enc, const uint8_t *src, size_t len) {
  if (enc_ensure(enc, len) == 0) {
    memcpy(&enc->buffer[enc->offset], src, len);
    enc->offset += len;
  }
}

/**
 * 寫入 CBOR 型別頭 (Major Type + Additional Info)
 * 支援 0 到 2^32-1 的長度
 */
static void enc_type_len(CborEncoder *enc, uint8_t major, uint32_t val) {
  uint8_t mt = (major << 5);
  if (val < 24) {
    enc_u8(enc, mt | (uint8_t)val);
  } else if (val <= 0xFFU) {
    enc_u8(enc, mt | CBOR_AI_UINT8);
    enc_u8(enc, (uint8_t)val);
  } else if (val <= 0xFFFFU) {
    enc_u8(enc, mt | CBOR_AI_UINT16);
    enc_u8(enc, (val >> 8) & 0xFF);
    enc_u8(enc, val & 0xFF);
  } else {
    enc_u8(enc, mt | CBOR_AI_UINT32);
    enc_u8(enc, (val >> 24) & 0xFF);
    enc_u8(enc, (val >> 16) & 0xFF);
    enc_u8(enc, (val >> 8) & 0xFF);
    enc_u8(enc, val & 0xFF);
  }
}

/**
 * 寫入 CBOR float64
 * 使用 union 進行 IEEE 754 大端序轉換
 */
static void enc_float64(CborEncoder *enc, double val) {
  union { double d; uint64_t u; } conv;
  conv.d = val;
  enc_u8(enc, (CBOR_SIMPLE << 5) | CBOR_AI_FLOAT64);
  /* 大端序：高位元組先寫 */
  enc_u8(enc, (conv.u >> 56) & 0xFF);
  enc_u8(enc, (conv.u >> 48) & 0xFF);
  enc_u8(enc, (conv.u >> 40) & 0xFF);
  enc_u8(enc, (conv.u >> 32) & 0xFF);
  enc_u8(enc, (conv.u >> 24) & 0xFF);
  enc_u8(enc, (conv.u >> 16) & 0xFF);
  enc_u8(enc, (conv.u >> 8) & 0xFF);
  enc_u8(enc, conv.u & 0xFF);
}

/* ==================== JSON 解析輔助函數 ==================== */

static void jp_skip_ws(JsonParser *jp) {
  while (jp->pos < jp->length) {
    char c = jp->json[jp->pos];
    if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
      jp->pos++;
    } else {
      break;
    }
  }
}

static char jp_peek(JsonParser *jp) {
  jp_skip_ws(jp);
  if (jp->pos >= jp->length) return '\0';
  return jp->json[jp->pos];
}

static char jp_next(JsonParser *jp) {
  jp_skip_ws(jp);
  if (jp->pos >= jp->length) return '\0';
  return jp->json[jp->pos++];
}

static int jp_expect(JsonParser *jp, char ch) {
  if (jp_next(jp) != ch) {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return -1;
  }
  return 0;
}

/**
 * 解析 JSON 字串，直接寫入 CBOR text string
 * 處理轉義序列：\" \\ \/ \b \f \n \r \t \uXXXX
 *
 * 策略：先計算解碼後長度，再寫入 CBOR
 * 注意：先掃描一遍得到實際 UTF-8 長度，再寫入 header + bytes
 */
static void encode_json_string(CborEncoder *enc, JsonParser *jp) {
  if (jp->error || enc->error) return;

  /* 期望開引號 */
  if (jp_next(jp) != '"') {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }

  /* 第一遍：掃描計算解碼後的 UTF-8 長度 */
  size_t scan_start = jp->pos;
  size_t utf8_len = 0;
  while (jp->pos < jp->length && jp->json[jp->pos] != '"') {
    if (jp->json[jp->pos] == '\\') {
      jp->pos++;
      if (jp->pos >= jp->length) {
        jp->error = GRAVITO_CBOR_ERROR_PARSE;
        return;
      }
      char esc = jp->json[jp->pos];
      if (esc == 'u') {
        /* \uXXXX - 解析 4 位十六進制 */
        jp->pos++;
        uint32_t cp = 0;
        int k;
        for (k = 0; k < 4 && jp->pos < jp->length; k++, jp->pos++) {
          char h = jp->json[jp->pos];
          if (h >= '0' && h <= '9') cp = (cp << 4) | (h - '0');
          else if (h >= 'a' && h <= 'f') cp = (cp << 4) | (h - 'a' + 10);
          else if (h >= 'A' && h <= 'F') cp = (cp << 4) | (h - 'A' + 10);
          else { jp->error = GRAVITO_CBOR_ERROR_PARSE; return; }
        }
        /* 處理 surrogate pair */
        if (cp >= 0xD800 && cp <= 0xDBFF) {
          /* 高代理，讀取低代理 \uXXXX */
          if (jp->pos + 1 < jp->length && jp->json[jp->pos] == '\\' && jp->json[jp->pos+1] == 'u') {
            jp->pos += 2;
            uint32_t low = 0;
            for (k = 0; k < 4 && jp->pos < jp->length; k++, jp->pos++) {
              char h = jp->json[jp->pos];
              if (h >= '0' && h <= '9') low = (low << 4) | (h - '0');
              else if (h >= 'a' && h <= 'f') low = (low << 4) | (h - 'a' + 10);
              else if (h >= 'A' && h <= 'F') low = (low << 4) | (h - 'A' + 10);
              else { jp->error = GRAVITO_CBOR_ERROR_PARSE; return; }
            }
            cp = 0x10000 + ((cp - 0xD800) << 10) + (low - 0xDC00);
          }
        }
        /* 計算 UTF-8 長度 */
        if (cp < 0x80) utf8_len += 1;
        else if (cp < 0x800) utf8_len += 2;
        else if (cp < 0x10000) utf8_len += 3;
        else utf8_len += 4;
        continue; /* 已經在 for 裡面推進 pos */
      }
      /* 其他轉義：\", \\, \/, \b, \f, \n, \r, \t -- 各1字元 */
      utf8_len += 1;
      jp->pos++;
    } else {
      /* 普通字元 -- 直接使用原始 UTF-8 字元 */
      /* UTF-8 多位元組：根據首位元組判斷 */
      unsigned char uc = (unsigned char)jp->json[jp->pos];
      if (uc < 0x80) { utf8_len += 1; jp->pos += 1; }
      else if ((uc & 0xE0) == 0xC0) { utf8_len += 2; jp->pos += 2; }
      else if ((uc & 0xF0) == 0xE0) { utf8_len += 3; jp->pos += 3; }
      else if ((uc & 0xF8) == 0xF0) { utf8_len += 4; jp->pos += 4; }
      else { utf8_len += 1; jp->pos += 1; }
    }
  }

  /* 跳過閉引號 */
  if (jp->pos >= jp->length || jp->json[jp->pos] != '"') {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }
  jp->pos++;

  /* 寫入 CBOR text string header */
  enc_type_len(enc, CBOR_TEXT, (uint32_t)utf8_len);

  /* 第二遍：實際寫入 UTF-8 資料 */
  size_t w_pos = scan_start;
  while (w_pos < jp->pos - 1) { /* -1 跳過閉引號 */
    if (jp->json[w_pos] == '\\') {
      w_pos++;
      char esc = jp->json[w_pos];
      switch (esc) {
        case '"':  enc_u8(enc, '"');  w_pos++; break;
        case '\\': enc_u8(enc, '\\'); w_pos++; break;
        case '/':  enc_u8(enc, '/');  w_pos++; break;
        case 'b':  enc_u8(enc, '\b'); w_pos++; break;
        case 'f':  enc_u8(enc, '\f'); w_pos++; break;
        case 'n':  enc_u8(enc, '\n'); w_pos++; break;
        case 'r':  enc_u8(enc, '\r'); w_pos++; break;
        case 't':  enc_u8(enc, '\t'); w_pos++; break;
        case 'u': {
          w_pos++;
          uint32_t cp = 0;
          int k;
          for (k = 0; k < 4; k++, w_pos++) {
            char h = jp->json[w_pos];
            if (h >= '0' && h <= '9') cp = (cp << 4) | (h - '0');
            else if (h >= 'a' && h <= 'f') cp = (cp << 4) | (h - 'a' + 10);
            else if (h >= 'A' && h <= 'F') cp = (cp << 4) | (h - 'A' + 10);
          }
          /* 處理 surrogate pair */
          if (cp >= 0xD800 && cp <= 0xDBFF) {
            if (jp->json[w_pos] == '\\' && jp->json[w_pos+1] == 'u') {
              w_pos += 2;
              uint32_t low = 0;
              for (k = 0; k < 4; k++, w_pos++) {
                char h = jp->json[w_pos];
                if (h >= '0' && h <= '9') low = (low << 4) | (h - '0');
                else if (h >= 'a' && h <= 'f') low = (low << 4) | (h - 'a' + 10);
                else if (h >= 'A' && h <= 'F') low = (low << 4) | (h - 'A' + 10);
              }
              cp = 0x10000 + ((cp - 0xD800) << 10) + (low - 0xDC00);
            }
          }
          /* 寫入 UTF-8 */
          if (cp < 0x80) {
            enc_u8(enc, (uint8_t)cp);
          } else if (cp < 0x800) {
            enc_u8(enc, 0xC0 | (cp >> 6));
            enc_u8(enc, 0x80 | (cp & 0x3F));
          } else if (cp < 0x10000) {
            enc_u8(enc, 0xE0 | (cp >> 12));
            enc_u8(enc, 0x80 | ((cp >> 6) & 0x3F));
            enc_u8(enc, 0x80 | (cp & 0x3F));
          } else {
            enc_u8(enc, 0xF0 | (cp >> 18));
            enc_u8(enc, 0x80 | ((cp >> 12) & 0x3F));
            enc_u8(enc, 0x80 | ((cp >> 6) & 0x3F));
            enc_u8(enc, 0x80 | (cp & 0x3F));
          }
          break;
        }
        default:
          enc_u8(enc, (uint8_t)esc);
          w_pos++;
          break;
      }
    } else {
      /* 普通字元 -- 直接拷貝 UTF-8 字節 */
      unsigned char uc = (unsigned char)jp->json[w_pos];
      if (uc < 0x80) {
        enc_u8(enc, uc);
        w_pos++;
      } else if ((uc & 0xE0) == 0xC0) {
        enc_bytes(enc, (const uint8_t*)&jp->json[w_pos], 2);
        w_pos += 2;
      } else if ((uc & 0xF0) == 0xE0) {
        enc_bytes(enc, (const uint8_t*)&jp->json[w_pos], 3);
        w_pos += 3;
      } else if ((uc & 0xF8) == 0xF0) {
        enc_bytes(enc, (const uint8_t*)&jp->json[w_pos], 4);
        w_pos += 4;
      } else {
        enc_u8(enc, uc);
        w_pos++;
      }
    }
  }
}

/* 前向宣告 */
static void encode_json_value(CborEncoder *enc, JsonParser *jp, int depth);

/**
 * 解析 JSON 數字，編碼為 CBOR uint/negint/float64
 *
 * JSON 數字規則：
 * - 整數：直接用 CBOR uint (>=0) 或 negint (<0)
 * - 浮點數：使用 CBOR float64
 * - 大於 2^32 的整數：使用 float64（與 JS Fallback 保持一致）
 */
static void encode_json_number(CborEncoder *enc, JsonParser *jp) {
  if (jp->error || enc->error) return;

  size_t start = jp->pos;
  int is_negative = 0;
  int has_dot = 0;
  int has_exp = 0;

  /* 讀取負號 */
  if (jp->pos < jp->length && jp->json[jp->pos] == '-') {
    is_negative = 1;
    jp->pos++;
  }

  /* 讀取整數部分 */
  while (jp->pos < jp->length && jp->json[jp->pos] >= '0' && jp->json[jp->pos] <= '9') {
    jp->pos++;
  }

  /* 檢查小數點 */
  if (jp->pos < jp->length && jp->json[jp->pos] == '.') {
    has_dot = 1;
    jp->pos++;
    while (jp->pos < jp->length && jp->json[jp->pos] >= '0' && jp->json[jp->pos] <= '9') {
      jp->pos++;
    }
  }

  /* 檢查指數 */
  if (jp->pos < jp->length && (jp->json[jp->pos] == 'e' || jp->json[jp->pos] == 'E')) {
    has_exp = 1;
    jp->pos++;
    if (jp->pos < jp->length && (jp->json[jp->pos] == '+' || jp->json[jp->pos] == '-')) {
      jp->pos++;
    }
    while (jp->pos < jp->length && jp->json[jp->pos] >= '0' && jp->json[jp->pos] <= '9') {
      jp->pos++;
    }
  }

  size_t num_len = jp->pos - start;
  if (num_len == 0 || (num_len == 1 && is_negative)) {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }

  /* 浮點數或帶指數 -> 使用 float64 */
  if (has_dot || has_exp) {
    /* 使用 strtod 精確解析浮點數 */
    /* 需要臨時空結束字串（JSON 數字不含空結束符） */
    char num_buf[64];
    if (num_len >= sizeof(num_buf)) {
      jp->error = GRAVITO_CBOR_ERROR_PARSE;
      return;
    }
    memcpy(num_buf, &jp->json[start], num_len);
    num_buf[num_len] = '\0';

    double result = strtod(num_buf, 0);
    enc_float64(enc, result);
    return;
  }

  /* 整數解析 */
  if (is_negative) {
    /* 負整數 */
    uint64_t abs_val = 0;
    size_t p = start + 1; /* 跳過 '-' */
    int overflow = 0;
    while (p < jp->pos) {
      uint64_t prev = abs_val;
      abs_val = abs_val * 10 + (jp->json[p] - '0');
      if (abs_val / 10 != prev) overflow = 1; /* 溢出檢測 */
      p++;
    }
    /* 檢查是否在 uint32 範圍：CBOR negint 編碼為 -1-n，所以 n = abs_val - 1 */
    uint64_t cbor_val = abs_val - 1; /* -1 對應 n=0, -256 對應 n=255, etc */
    if (!overflow && cbor_val <= 0xFFFFFFFFUL) {
      enc_type_len(enc, CBOR_NEGINT, (uint32_t)cbor_val);
    } else {
      /* 超過 32-bit 範圍，使用 float64（與 JS Fallback 一致） */
      enc_float64(enc, -(double)abs_val);
    }
  } else {
    /* 正整數 */
    uint64_t val = 0;
    size_t p = start;
    int overflow = 0;
    while (p < jp->pos) {
      uint64_t prev = val;
      val = val * 10 + (jp->json[p] - '0');
      if (val / 10 != prev) overflow = 1;
      p++;
    }
    if (!overflow && val <= 0xFFFFFFFFUL) {
      enc_type_len(enc, CBOR_UINT, (uint32_t)val);
    } else {
      /* 超過 32-bit 範圍，使用 float64（與 JS Fallback 一致） */
      enc_float64(enc, (double)val);
    }
  }
}

/**
 * 解析 JSON object，編碼為 CBOR map
 */
static void encode_json_object(CborEncoder *enc, JsonParser *jp, int depth) {
  if (jp->error || enc->error) return;
  if (depth >= GRAVITO_CBOR_MAX_DEPTH) {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }

  /* 期望 '{' */
  if (jp_next(jp) != '{') {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }

  /* 先掃描計算 key 數量（不寫入任何東西） */
  size_t saved_pos = jp->pos;
  size_t saved_enc_offset = enc->offset;
  uint32_t count = 0;

  /* 跳過空物件 */
  if (jp_peek(jp) == '}') {
    jp->pos++; /* 消耗 '}' */
    enc_type_len(enc, CBOR_MAP, 0);
    return;
  }

  /* 計算 key 數量（簡易方法：掃描頂層逗號數 + 1）*/
  {
    int scan_depth = 0;
    size_t scan_pos = jp->pos;
    count = 1;
    while (scan_pos < jp->length) {
      char c = jp->json[scan_pos];
      if (c == '"') {
        scan_pos++;
        while (scan_pos < jp->length && jp->json[scan_pos] != '"') {
          if (jp->json[scan_pos] == '\\') scan_pos++; /* 跳過轉義 */
          scan_pos++;
        }
        scan_pos++; /* 跳過閉引號 */
        continue;
      }
      if (c == '{' || c == '[') { scan_depth++; scan_pos++; continue; }
      if (c == '}' || c == ']') {
        if (scan_depth == 0) break;
        scan_depth--;
        scan_pos++;
        continue;
      }
      if (c == ',' && scan_depth == 0) count++;
      scan_pos++;
    }
  }

  /* 寫入 CBOR map header */
  enc_type_len(enc, CBOR_MAP, count);

  /* 解析 key-value 對 */
  uint32_t i;
  for (i = 0; i < count; i++) {
    if (jp->error || enc->error) return;

    if (i > 0) {
      if (jp_next(jp) != ',') {
        jp->error = GRAVITO_CBOR_ERROR_PARSE;
        return;
      }
    }

    /* 解析 key（必須是字串） */
    jp_skip_ws(jp);
    encode_json_string(enc, jp);
    if (jp->error || enc->error) return;

    /* 期望 ':' */
    if (jp_next(jp) != ':') {
      jp->error = GRAVITO_CBOR_ERROR_PARSE;
      return;
    }

    /* 解析 value */
    encode_json_value(enc, jp, depth + 1);
  }

  /* 期望 '}' */
  if (jp_next(jp) != '}') {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }
}

/**
 * 解析 JSON array，編碼為 CBOR array
 */
static void encode_json_array(CborEncoder *enc, JsonParser *jp, int depth) {
  if (jp->error || enc->error) return;
  if (depth >= GRAVITO_CBOR_MAX_DEPTH) {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }

  /* 期望 '[' */
  if (jp_next(jp) != '[') {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }

  /* 空陣列 */
  if (jp_peek(jp) == ']') {
    jp->pos++; /* 消耗 ']' */
    enc_type_len(enc, CBOR_ARRAY, 0);
    return;
  }

  /* 計算元素數量 */
  uint32_t count = 1;
  {
    int scan_depth = 0;
    size_t scan_pos = jp->pos;
    while (scan_pos < jp->length) {
      char c = jp->json[scan_pos];
      if (c == '"') {
        scan_pos++;
        while (scan_pos < jp->length && jp->json[scan_pos] != '"') {
          if (jp->json[scan_pos] == '\\') scan_pos++;
          scan_pos++;
        }
        scan_pos++;
        continue;
      }
      if (c == '{' || c == '[') { scan_depth++; scan_pos++; continue; }
      if (c == '}' || c == ']') {
        if (scan_depth == 0) break;
        scan_depth--;
        scan_pos++;
        continue;
      }
      if (c == ',' && scan_depth == 0) count++;
      scan_pos++;
    }
  }

  /* 寫入 CBOR array header */
  enc_type_len(enc, CBOR_ARRAY, count);

  /* 解析元素 */
  uint32_t i;
  for (i = 0; i < count; i++) {
    if (jp->error || enc->error) return;
    if (i > 0) {
      if (jp_next(jp) != ',') {
        jp->error = GRAVITO_CBOR_ERROR_PARSE;
        return;
      }
    }
    encode_json_value(enc, jp, depth + 1);
  }

  /* 期望 ']' */
  if (jp_next(jp) != ']') {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }
}

/**
 * 解析單個 JSON 值，編碼為對應的 CBOR 類型
 */
static void encode_json_value(CborEncoder *enc, JsonParser *jp, int depth) {
  if (jp->error || enc->error) return;
  if (depth >= GRAVITO_CBOR_MAX_DEPTH) {
    jp->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }

  char c = jp_peek(jp);

  switch (c) {
    case '{':
      encode_json_object(enc, jp, depth);
      break;

    case '[':
      encode_json_array(enc, jp, depth);
      break;

    case '"':
      encode_json_string(enc, jp);
      break;

    case 't':
      /* true */
      if (jp->pos + 4 <= jp->length &&
          jp->json[jp->pos] == 't' && jp->json[jp->pos+1] == 'r' &&
          jp->json[jp->pos+2] == 'u' && jp->json[jp->pos+3] == 'e') {
        jp->pos += 4;
        enc_u8(enc, (CBOR_SIMPLE << 5) | CBOR_TRUE);
      } else {
        jp->error = GRAVITO_CBOR_ERROR_PARSE;
      }
      break;

    case 'f':
      /* false */
      if (jp->pos + 5 <= jp->length &&
          jp->json[jp->pos] == 'f' && jp->json[jp->pos+1] == 'a' &&
          jp->json[jp->pos+2] == 'l' && jp->json[jp->pos+3] == 's' &&
          jp->json[jp->pos+4] == 'e') {
        jp->pos += 5;
        enc_u8(enc, (CBOR_SIMPLE << 5) | CBOR_FALSE);
      } else {
        jp->error = GRAVITO_CBOR_ERROR_PARSE;
      }
      break;

    case 'n':
      /* null */
      if (jp->pos + 4 <= jp->length &&
          jp->json[jp->pos] == 'n' && jp->json[jp->pos+1] == 'u' &&
          jp->json[jp->pos+2] == 'l' && jp->json[jp->pos+3] == 'l') {
        jp->pos += 4;
        enc_u8(enc, (CBOR_SIMPLE << 5) | CBOR_NULL);
      } else {
        jp->error = GRAVITO_CBOR_ERROR_PARSE;
      }
      break;

    case '-':
    case '0': case '1': case '2': case '3': case '4':
    case '5': case '6': case '7': case '8': case '9':
      encode_json_number(enc, jp);
      break;

    default:
      jp->error = GRAVITO_CBOR_ERROR_PARSE;
      break;
  }
}

/* ==================== 解碼輔助函數 ==================== */

static int dec_has(CborDecoder *dec, size_t needed) {
  if (dec->error) return 0;
  if (dec->offset + needed > dec->length) {
    dec->error = GRAVITO_CBOR_ERROR_PARSE;
    return 0;
  }
  return 1;
}

static uint8_t dec_u8(CborDecoder *dec) {
  if (!dec_has(dec, 1)) return 0;
  return dec->data[dec->offset++];
}

/**
 * 讀取 CBOR additional info 的值
 */
static uint32_t dec_read_uint(CborDecoder *dec, uint8_t ai) {
  if (ai < 24) return ai;
  if (ai == CBOR_AI_UINT8) return dec_u8(dec);
  if (ai == CBOR_AI_UINT16) {
    uint8_t b1 = dec_u8(dec);
    uint8_t b2 = dec_u8(dec);
    return ((uint32_t)b1 << 8) | b2;
  }
  if (ai == CBOR_AI_UINT32) {
    uint8_t b1 = dec_u8(dec);
    uint8_t b2 = dec_u8(dec);
    uint8_t b3 = dec_u8(dec);
    uint8_t b4 = dec_u8(dec);
    return ((uint32_t)b1 << 24) | ((uint32_t)b2 << 16) | ((uint32_t)b3 << 8) | b4;
  }
  /* UINT64 不支援 */
  dec->error = GRAVITO_CBOR_ERROR_PARSE;
  return 0;
}

/**
 * JSON 輸出輔助函數
 */
typedef struct {
  char   *buffer;
  size_t  capacity;
  size_t  offset;
  int     error;
} JsonWriter;

static void jw_ensure(JsonWriter *jw, size_t needed) {
  if (jw->error) return;
  if (jw->offset + needed > jw->capacity) {
    jw->error = GRAVITO_CBOR_ERROR_BUFFER_FULL;
  }
}

static void jw_char(JsonWriter *jw, char c) {
  jw_ensure(jw, 1);
  if (!jw->error) jw->buffer[jw->offset++] = c;
}

static void jw_str(JsonWriter *jw, const char *s, size_t len) {
  jw_ensure(jw, len);
  if (!jw->error) {
    memcpy(&jw->buffer[jw->offset], s, len);
    jw->offset += len;
  }
}

/**
 * 寫入 JSON 字串（帶轉義）
 */
static void jw_json_string(JsonWriter *jw, const uint8_t *utf8, size_t len) {
  jw_char(jw, '"');
  size_t i;
  for (i = 0; i < len; i++) {
    uint8_t c = utf8[i];
    switch (c) {
      case '"':  jw_str(jw, "\\\"", 2); break;
      case '\\': jw_str(jw, "\\\\", 2); break;
      case '\b': jw_str(jw, "\\b", 2);  break;
      case '\f': jw_str(jw, "\\f", 2);  break;
      case '\n': jw_str(jw, "\\n", 2);  break;
      case '\r': jw_str(jw, "\\r", 2);  break;
      case '\t': jw_str(jw, "\\t", 2);  break;
      default:
        if (c < 0x20) {
          /* 控制字元：\u00XX */
          char hex[7];
          hex[0] = '\\'; hex[1] = 'u'; hex[2] = '0'; hex[3] = '0';
          hex[4] = "0123456789abcdef"[(c >> 4) & 0xF];
          hex[5] = "0123456789abcdef"[c & 0xF];
          jw_str(jw, hex, 6);
        } else {
          jw_char(jw, (char)c);
        }
        break;
    }
  }
  jw_char(jw, '"');
}

/**
 * 寫入無符號整數的十進制表示
 */
static void jw_uint(JsonWriter *jw, uint32_t val) {
  char buf[12]; /* 最多 10 位 + 安全 */
  int len = 0;
  if (val == 0) {
    jw_char(jw, '0');
    return;
  }
  while (val > 0) {
    buf[len++] = '0' + (val % 10);
    val /= 10;
  }
  /* 反轉 */
  int i;
  for (i = len - 1; i >= 0; i--) {
    jw_char(jw, buf[i]);
  }
}

/**
 * 寫入 float64 的 JSON 表示
 * 使用 snprintf + 精度搜尋找到最短的精確表示
 */
static void jw_float64(JsonWriter *jw, double val) {
  /* 特殊值處理（JSON 不支援 NaN/Infinity） */
  if (val != val) { jw_str(jw, "null", 4); return; }
  if (val == 1.0/0.0) { jw_str(jw, "null", 4); return; }
  if (val == -1.0/0.0) { jw_str(jw, "null", 4); return; }

  char buf[32];
  int len;
  int prec;

  /* 找到最短的精確表示（往返一致性） */
  for (prec = 1; prec <= 17; prec++) {
    len = snprintf(buf, sizeof(buf), "%.*g", prec, val);
    double check = strtod(buf, 0);
    if (check == val) {
      jw_str(jw, buf, len);
      return;
    }
  }

  /* 回退到最大精度 */
  len = snprintf(buf, sizeof(buf), "%.17g", val);
  jw_str(jw, buf, len);
}

/* 前向宣告 */
static void decode_cbor_value(CborDecoder *dec, JsonWriter *jw, int depth);

/**
 * 解碼 CBOR 值為 JSON
 */
static void decode_cbor_value(CborDecoder *dec, JsonWriter *jw, int depth) {
  if (dec->error || jw->error) return;
  if (depth >= GRAVITO_CBOR_MAX_DEPTH) {
    dec->error = GRAVITO_CBOR_ERROR_PARSE;
    return;
  }

  uint8_t byte = dec_u8(dec);
  if (dec->error) return;

  uint8_t mt = (byte >> 5) & 0x07;
  uint8_t ai = byte & 0x1F;

  switch (mt) {
    case CBOR_UINT: {
      uint32_t val = dec_read_uint(dec, ai);
      if (!dec->error) jw_uint(jw, val);
      break;
    }

    case CBOR_NEGINT: {
      uint32_t val = dec_read_uint(dec, ai);
      if (!dec->error) {
        /* CBOR negint: -1 - n */
        jw_char(jw, '-');
        /* 需要輸出 val + 1 */
        jw_uint(jw, val + 1);
      }
      break;
    }

    case CBOR_BYTES: {
      /* 位元組串 - 不常見於 JSON，跳過 */
      uint32_t len = dec_read_uint(dec, ai);
      if (!dec->error) {
        if (!dec_has(dec, len)) return;
        /* 輸出為 null（JSON 不支援原始位元組） */
        jw_str(jw, "null", 4);
        dec->offset += len;
      }
      break;
    }

    case CBOR_TEXT: {
      uint32_t len = dec_read_uint(dec, ai);
      if (dec->error) return;
      if (!dec_has(dec, len)) return;
      const uint8_t *text = &dec->data[dec->offset];
      jw_json_string(jw, text, len);
      dec->offset += len;
      break;
    }

    case CBOR_ARRAY: {
      uint32_t count = dec_read_uint(dec, ai);
      if (dec->error) return;
      jw_char(jw, '[');
      uint32_t i;
      for (i = 0; i < count; i++) {
        if (dec->error || jw->error) return;
        if (i > 0) jw_char(jw, ',');
        decode_cbor_value(dec, jw, depth + 1);
      }
      jw_char(jw, ']');
      break;
    }

    case CBOR_MAP: {
      uint32_t count = dec_read_uint(dec, ai);
      if (dec->error) return;
      jw_char(jw, '{');
      uint32_t i;
      for (i = 0; i < count; i++) {
        if (dec->error || jw->error) return;
        if (i > 0) jw_char(jw, ',');
        /* key */
        decode_cbor_value(dec, jw, depth + 1);
        jw_char(jw, ':');
        /* value */
        decode_cbor_value(dec, jw, depth + 1);
      }
      jw_char(jw, '}');
      break;
    }

    case CBOR_TAG: {
      /* 跳過 tag，直接解碼內容 */
      dec_read_uint(dec, ai); /* 讀取 tag number 但忽略 */
      decode_cbor_value(dec, jw, depth);
      break;
    }

    case CBOR_SIMPLE: {
      if (ai == CBOR_FALSE) {
        jw_str(jw, "false", 5);
      } else if (ai == CBOR_TRUE) {
        jw_str(jw, "true", 4);
      } else if (ai == CBOR_NULL) {
        jw_str(jw, "null", 4);
      } else if (ai == CBOR_AI_FLOAT64) {
        /* 讀取 8 bytes IEEE 754 double */
        if (!dec_has(dec, 8)) return;
        union { double d; uint64_t u; } conv;
        conv.u = 0;
        int i;
        for (i = 0; i < 8; i++) {
          conv.u = (conv.u << 8) | dec->data[dec->offset++];
        }
        jw_float64(jw, conv.d);
      } else if (ai == CBOR_AI_UINT16) {
        /* float16 - 簡化處理，直接跳過 */
        if (!dec_has(dec, 2)) return;
        dec->offset += 2;
        jw_str(jw, "0", 1);
      } else if (ai == CBOR_AI_UINT32) {
        /* float32 */
        if (!dec_has(dec, 4)) return;
        union { float f; uint32_t u; } conv32;
        conv32.u = 0;
        int i;
        for (i = 0; i < 4; i++) {
          conv32.u = (conv32.u << 8) | dec->data[dec->offset++];
        }
        jw_float64(jw, (double)conv32.f);
      } else {
        dec->error = GRAVITO_CBOR_ERROR_PARSE;
      }
      break;
    }

    default:
      dec->error = GRAVITO_CBOR_ERROR_PARSE;
      break;
  }
}

/* ==================== 公開 API ==================== */

/**
 * 編碼 JSON 字串為 CBOR 二進制
 *
 * 輸入：JSON 字串（通常來自 JSON.stringify(obj)）
 * 輸出：CBOR 二進制資料
 *
 * @param json_input  JSON 字串指標
 * @param json_len    JSON 字串長度（位元組）
 * @param output_buf  輸出 buffer 指標
 * @param output_cap  輸出 buffer 容量
 * @return > 0: 寫入的位元組數
 *         -1: buffer 不足
 *         -2: JSON 解析錯誤
 */
int gravito_cbor_encode(const char *json_input, size_t json_len,
                        uint8_t *output_buf, size_t output_cap) {
  if (!json_input || !output_buf || json_len == 0) {
    return GRAVITO_CBOR_ERROR_PARSE;
  }

  CborEncoder enc;
  enc.buffer = output_buf;
  enc.capacity = output_cap;
  enc.offset = 0;
  enc.error = 0;

  JsonParser jp;
  jp.json = json_input;
  jp.length = json_len;
  jp.pos = 0;
  jp.error = 0;

  /* 跳過前導空白 */
  jp_skip_ws(&jp);

  /* 根值必須是物件或陣列 */
  char first = jp_peek(&jp);
  if (first == '{') {
    encode_json_object(&enc, &jp, 0);
  } else if (first == '[') {
    encode_json_array(&enc, &jp, 0);
  } else {
    return GRAVITO_CBOR_ERROR_PARSE;
  }

  if (jp.error) return jp.error;
  if (enc.error) return enc.error;

  return (int)enc.offset;
}

/**
 * 解碼 CBOR 二進制為 JSON 字串
 *
 * @param cbor_input  CBOR 二進制資料
 * @param cbor_len    CBOR 資料長度
 * @param json_output JSON 輸出 buffer
 * @param json_cap    JSON 輸出 buffer 容量
 * @return > 0: 寫入的位元組數
 *         -1: buffer 不足
 *         -2: CBOR 解碼錯誤
 */
int gravito_cbor_decode(const uint8_t *cbor_input, size_t cbor_len,
                        char *json_output, size_t json_cap) {
  if (!cbor_input || !json_output || cbor_len == 0) {
    return GRAVITO_CBOR_ERROR_PARSE;
  }

  CborDecoder dec;
  dec.data = cbor_input;
  dec.length = cbor_len;
  dec.offset = 0;
  dec.error = 0;

  JsonWriter jw;
  jw.buffer = json_output;
  jw.capacity = json_cap;
  jw.offset = 0;
  jw.error = 0;

  decode_cbor_value(&dec, &jw, 0);

  if (dec.error) return dec.error;
  if (jw.error) return jw.error;

  return (int)jw.offset;
}

/* ==================== 輔助測試函數 ==================== */

/**
 * 向 buffer 寫入 CBOR 字串（用於測試）
 */
size_t gravito_cbor_write_string(uint8_t *output_buf, size_t output_cap,
                                  const char *str) {
  CborEncoder enc;
  enc.buffer = output_buf;
  enc.capacity = output_cap;
  enc.offset = 0;
  enc.error = 0;

  size_t str_len = strlen(str);
  enc_type_len(&enc, CBOR_TEXT, (uint32_t)str_len);
  enc_bytes(&enc, (const uint8_t *)str, str_len);

  if (enc.error != 0) return 0;
  return enc.offset;
}

/**
 * 向 buffer 寫入 CBOR 整數（用於測試）
 */
size_t gravito_cbor_write_int(uint8_t *output_buf, size_t output_cap,
                               int64_t value) {
  CborEncoder enc;
  enc.buffer = output_buf;
  enc.capacity = output_cap;
  enc.offset = 0;
  enc.error = 0;

  if (value >= 0) {
    enc_type_len(&enc, CBOR_UINT, (uint32_t)value);
  } else {
    enc_type_len(&enc, CBOR_NEGINT, (uint32_t)(-1 - value));
  }

  if (enc.error != 0) return 0;
  return enc.offset;
}

/**
 * 向 buffer 寫入 CBOR null（用於測試）
 */
size_t gravito_cbor_write_null(uint8_t *output_buf, size_t output_cap) {
  if (output_cap < 1) return 0;
  output_buf[0] = (CBOR_SIMPLE << 5) | CBOR_NULL;
  return 1;
}

/**
 * 向 buffer 寫入 CBOR 布林值（用於測試）
 */
size_t gravito_cbor_write_bool(uint8_t *output_buf, size_t output_cap,
                                int value) {
  if (output_cap < 1) return 0;
  uint8_t sv = value ? CBOR_TRUE : CBOR_FALSE;
  output_buf[0] = (CBOR_SIMPLE << 5) | sv;
  return 1;
}
