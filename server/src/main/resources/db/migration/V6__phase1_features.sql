-- V6: Phase 1 features - 好友备注、黑名单、会话免打扰、会话删除、群禁言、消息收藏

-- 好友备注
ALTER TABLE friendships ADD COLUMN remark VARCHAR(50) DEFAULT NULL;

-- 黑名单表
CREATE TABLE IF NOT EXISTS blacklist (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    blocked_user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_blacklist_user_blocked (user_id, blocked_user_id),
    INDEX idx_blacklist_user_id (user_id)
);

-- 会话免打扰 + 会话隐藏（软删除）
ALTER TABLE conversation_members ADD COLUMN muted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversation_members ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE conversation_members ADD COLUMN muted_until DATETIME DEFAULT NULL;

-- 群全员禁言
ALTER TABLE conversations ADD COLUMN mute_all BOOLEAN NOT NULL DEFAULT FALSE;

-- 消息收藏表
CREATE TABLE IF NOT EXISTS message_favorites (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL,
    conversation_id BIGINT NOT NULL,
    content TEXT,
    type VARCHAR(20) NOT NULL,
    sender_name VARCHAR(50),
    metadata VARCHAR(1000),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_favorite_user_message (user_id, message_id),
    INDEX idx_favorite_user_id (user_id)
);
