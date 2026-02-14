-- Migration: 006_create_payments_table
-- Description: 創建支付表
-- Timestamp: 2024-02-13

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  method VARCHAR(50) NOT NULL CHECK (method IN ('credit_card', 'debit_card', 'paypal', 'bank_transfer')),
  gateway VARCHAR(50) NOT NULL CHECK (gateway IN ('stripe', 'paypal', 'square')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  transaction_id VARCHAR(255),
  receipt_url VARCHAR(255),
  failure_reason TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
  metadata JSONB,
  paid_at TIMESTAMP,
  failed_at TIMESTAMP,
  refunded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- 創建索引以提高查詢性能
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway ON payments(gateway);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
CREATE INDEX idx_payments_deleted_at ON payments(deleted_at);

-- 複合索引用於常見查詢
CREATE INDEX idx_payments_user_status ON payments(user_id, status);
CREATE INDEX idx_payments_order_status ON payments(order_id, status);

-- 創建觸發器自動更新 updated_at
CREATE TRIGGER payments_update_updated_at BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
