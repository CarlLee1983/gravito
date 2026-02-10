-- 原子化快取預熱操作
-- 參數：
--   KEYS[1] - 快取鍵
--   ARGV[1] - 熱度值 (JSON)
--   ARGV[2] - TTL (秒)

local key = KEYS[1]
local value = ARGV[1]
local ttl = tonumber(ARGV[2])

-- 設置快取值
redis.call('SET', key, value, 'EX', ttl)

-- 記錄預熱事件
local event_key = 'warmup_events:' .. os.time()
redis.call('LPUSH', event_key, key)
redis.call('EXPIRE', event_key, 86400)  -- 24 小時

return 1
