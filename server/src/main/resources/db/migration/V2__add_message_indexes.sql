-- 为消息表添加索引以优化查询性能

-- 会话ID索引（用于按会话查询消息）
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- 会话ID + 创建时间复合索引（用于按会话查询并按时间排序）
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- 发送者ID索引（用于查询用户发送的消息）
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- 会话成员表索引
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_user ON conversation_members(conversation_id, user_id);
