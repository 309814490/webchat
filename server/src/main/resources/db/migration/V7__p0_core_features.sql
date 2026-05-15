-- V7: P0 核心功能 - 语音消息 + 消息通知设置

-- 用户通知设置表
CREATE TABLE IF NOT EXISTS user_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notification_sound BOOLEAN NOT NULL DEFAULT TRUE,
    notification_vibrate BOOLEAN NOT NULL DEFAULT TRUE,
    notification_preview BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_settings_user_id (user_id)
);
