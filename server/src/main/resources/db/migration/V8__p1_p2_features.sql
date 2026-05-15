-- V8: P1 + P2 功能完整实现

-- ==================== P1 功能 ====================

-- 1. 群文件共享
CREATE TABLE IF NOT EXISTS group_files (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT NOT NULL,
    uploader_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100),
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_group_files_group_id (group_id),
    INDEX idx_group_files_uploader_id (uploader_id)
);

-- 2. 群二维码（使用现有 conversations 表）
-- 无需新表，前端生成二维码

-- 3. 群名片
ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS group_nickname VARCHAR(50) DEFAULT NULL COMMENT '群内昵称';

-- 4. 文件预览（前端实现，无需数据库）

-- 5. 图片/视频预览优化（前端实现，无需数据库）

-- 6. 消息已读回执详细
CREATE TABLE IF NOT EXISTS message_read_receipts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_message_user (message_id, user_id),
    INDEX idx_message_read_receipts_message_id (message_id)
);

-- 7. 好友标签
CREATE TABLE IF NOT EXISTS friend_tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    tag_name VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT '#3B82F6',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_friend_tags_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS friendship_tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    friendship_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    UNIQUE KEY uk_friendship_tag (friendship_id, tag_id),
    INDEX idx_friendship_tags_friendship_id (friendship_id),
    INDEX idx_friendship_tags_tag_id (tag_id)
);

-- ==================== P2 功能 ====================

-- 1. 消息编辑
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已编辑';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edit_history JSON DEFAULT NULL COMMENT '编辑历史';

-- 2. 消息多选操作（前端实现，无需数据库）

-- 3. 聊天记录导出（前端实现，无需数据库）

-- 4. 群投票
CREATE TABLE IF NOT EXISTS group_polls (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT NOT NULL,
    creator_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    options JSON NOT NULL COMMENT '投票选项',
    multiple_choice BOOLEAN NOT NULL DEFAULT FALSE,
    anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    deadline DATETIME DEFAULT NULL,
    closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_group_polls_group_id (group_id)
);

CREATE TABLE IF NOT EXISTS poll_votes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    poll_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    option_index INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_poll_votes_poll_id (poll_id),
    INDEX idx_poll_votes_user_id (user_id)
);

-- 5. 群待办
CREATE TABLE IF NOT EXISTS group_todos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    group_id BIGINT NOT NULL,
    creator_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assignee_id BIGINT DEFAULT NULL,
    deadline DATETIME DEFAULT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_group_todos_group_id (group_id),
    INDEX idx_group_todos_assignee_id (assignee_id)
);

-- 6. 表情回应
CREATE TABLE IF NOT EXISTS message_reactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_message_user_emoji (message_id, user_id, emoji),
    INDEX idx_message_reactions_message_id (message_id)
);

-- 7. 位置分享（使用 messages 表的 metadata 字段存储位置信息）
-- 无需新表

-- 8. 深色模式
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS dark_mode BOOLEAN NOT NULL DEFAULT FALSE COMMENT '深色模式';

-- 9. 个性签名
ALTER TABLE users ADD COLUMN IF NOT EXISTS signature VARCHAR(200) DEFAULT NULL COMMENT '个性签名';

-- 10. 草稿箱
CREATE TABLE IF NOT EXISTS message_drafts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    conversation_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_conversation (user_id, conversation_id),
    INDEX idx_message_drafts_user_id (user_id)
);
