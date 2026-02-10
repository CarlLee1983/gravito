-- 批量刪除操作
-- 參數：
--   KEYS - 要刪除的鍵
--   ARGV[1] - 模式 (可選)

local keys = redis.call('KEYS', ARGV[1])
if #keys > 0 then
  redis.call('DEL', unpack(keys))
end

-- 記錄失效事件
local event_key = 'invalidation_events:' .. os.time()
redis.call('LPUSH', event_key, ARGV[1])
redis.call('EXPIRE', event_key, 86400)  -- 24 小時

return #keys
