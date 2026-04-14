-- 为消息表添加回复功能支持
ALTER TABLE messages ADD COLUMN reply_to_id BIGINT NULL;

-- 添加外键约束
ALTER TABLE messages ADD CONSTRAINT fk_messages_reply_to FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL;

-- 添加索引
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);
