-- 会话置顶功能
ALTER TABLE conversation_members ADD COLUMN pinned TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE conversation_members ADD COLUMN pinned_at DATETIME(6) DEFAULT NULL;

-- 群隐私设置
ALTER TABLE conversations ADD COLUMN allow_member_add_friend TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN allow_member_view_profile TINYINT(1) NOT NULL DEFAULT 0;
