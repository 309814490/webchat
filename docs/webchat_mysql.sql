-- WebChat MySQL 初始化脚本
-- 适用版本：MySQL 8.0+
-- 使用自增主键，无外键约束

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `webchat`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `webchat`;

-- 删除已存在的表
DROP TABLE IF EXISTS `login_logs`;
DROP TABLE IF EXISTS `message_read_status`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `conversation_members`;
DROP TABLE IF EXISTS `conversations`;
DROP TABLE IF EXISTS `group_members`;
DROP TABLE IF EXISTS `groups`;
DROP TABLE IF EXISTS `friend_requests`;
DROP TABLE IF EXISTS `friendships`;
DROP TABLE IF EXISTS `users`;

-- 用户表
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) NOT NULL COMMENT '用户名(姓名)',
  `student_id` varchar(20) DEFAULT NULL COMMENT '学号',
  `id_card` varchar(18) DEFAULT NULL COMMENT '身份证号',
  `email` varchar(100) NOT NULL COMMENT '邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号(用于登录)',
  `password_hash` varchar(255) NOT NULL COMMENT '密码哈希',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `status` varchar(20) NOT NULL DEFAULT 'OFFLINE' COMMENT '在线状态',
  `deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除标记(0-未删除,1-已删除)',
  `deleted_at` datetime(6) DEFAULT NULL COMMENT '删除时间',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_student_id` (`student_id`),
  KEY `idx_users_phone` (`phone`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_deleted` (`deleted`),
  KEY `idx_users_created_at` (`created_at`),
  CONSTRAINT `chk_users_status` CHECK (`status` in ('ONLINE','OFFLINE','AWAY'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 会话表
CREATE TABLE `conversations` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '会话ID',
  `type` varchar(20) NOT NULL COMMENT '会话类型',
  `name` varchar(100) DEFAULT NULL COMMENT '群组名称',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '群组头像URL',
  `created_by` bigint NOT NULL COMMENT '创建者ID',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_conversations_created_by` (`created_by`),
  KEY `idx_conversations_type` (`type`),
  KEY `idx_conversations_created_at` (`created_at`),
  CONSTRAINT `chk_conversations_type` CHECK (`type` in ('PRIVATE','GROUP'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话表';

-- 会话成员表
CREATE TABLE `conversation_members` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '会话成员ID',
  `conversation_id` bigint NOT NULL COMMENT '会话ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role` varchar(20) NOT NULL DEFAULT 'MEMBER' COMMENT '成员角色',
  `joined_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '加入时间',
  `last_read_at` datetime(6) DEFAULT NULL COMMENT '最后阅读时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_conversation_members_conversation_user` (`conversation_id`, `user_id`),
  KEY `idx_conversation_members_user_id` (`user_id`),
  KEY `idx_conversation_members_conversation_id` (`conversation_id`),
  KEY `idx_conversation_members_joined_at` (`joined_at`),
  CONSTRAINT `chk_conversation_members_role` CHECK (`role` in ('OWNER','ADMIN','MEMBER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话成员表';

-- 消息表
CREATE TABLE `messages` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `conversation_id` bigint NOT NULL COMMENT '会话ID',
  `sender_id` bigint NOT NULL COMMENT '发送者ID',
  `content` text NOT NULL COMMENT '消息内容',
  `type` varchar(20) NOT NULL COMMENT '消息类型',
  `metadata` json DEFAULT NULL COMMENT '元数据(JSON格式)',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_messages_conversation_created` (`conversation_id`, `created_at`),
  KEY `idx_messages_sender_id` (`sender_id`),
  KEY `idx_messages_type` (`type`),
  KEY `idx_messages_created_at` (`created_at`),
  CONSTRAINT `chk_messages_type` CHECK (`type` in ('TEXT','IMAGE','FILE','VIDEO','EMOJI'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息表';

-- 消息已读状态表
CREATE TABLE `message_read_status` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '已读状态ID',
  `message_id` bigint NOT NULL COMMENT '消息ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `read_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '阅读时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_read_status_message_user` (`message_id`, `user_id`),
  KEY `idx_message_read_status_user_id` (`user_id`),
  KEY `idx_message_read_status_message_id` (`message_id`),
  KEY `idx_message_read_status_read_at` (`read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息已读状态表';

-- 登录日志表
CREATE TABLE `login_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id` bigint DEFAULT NULL COMMENT '用户ID',
  `login_time` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '登录时间',
  `ip_address` varchar(50) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` varchar(500) DEFAULT NULL COMMENT '用户代理',
  `login_status` varchar(20) NOT NULL DEFAULT 'SUCCESS' COMMENT '登录状态',
  `failure_reason` varchar(200) DEFAULT NULL COMMENT '失败原因',
  `device_type` varchar(50) DEFAULT NULL COMMENT '设备类型',
  `browser` varchar(50) DEFAULT NULL COMMENT '浏览器',
  `os` varchar(50) DEFAULT NULL COMMENT '操作系统',
  PRIMARY KEY (`id`),
  KEY `idx_login_logs_user_id` (`user_id`),
  KEY `idx_login_logs_login_time` (`login_time`),
  KEY `idx_login_logs_ip_address` (`ip_address`),
  KEY `idx_login_logs_login_status` (`login_status`),
  CONSTRAINT `chk_login_logs_status` CHECK (`login_status` in ('SUCCESS','FAILURE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录日志表';

-- 好友关系表
CREATE TABLE `friendships` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '好友关系ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `friend_id` bigint NOT NULL COMMENT '好友ID',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_friendships_user_friend` (`user_id`, `friend_id`),
  KEY `idx_friendships_user_id` (`user_id`),
  KEY `idx_friendships_friend_id` (`friend_id`),
  KEY `idx_friendships_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='好友关系表';

-- 好友请求表
CREATE TABLE `friend_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '好友请求ID',
  `from_user_id` bigint NOT NULL COMMENT '发起用户ID',
  `to_user_id` bigint NOT NULL COMMENT '接收用户ID',
  `status` varchar(20) NOT NULL DEFAULT 'PENDING' COMMENT '请求状态',
  `message` varchar(200) DEFAULT NULL COMMENT '请求消息',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_friend_requests_from_user` (`from_user_id`),
  KEY `idx_friend_requests_to_user` (`to_user_id`),
  KEY `idx_friend_requests_status` (`status`),
  KEY `idx_friend_requests_created_at` (`created_at`),
  CONSTRAINT `chk_friend_requests_status` CHECK (`status` in ('PENDING','ACCEPTED','REJECTED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='好友请求表';

-- 群组表
CREATE TABLE `groups` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '群组ID',
  `name` varchar(100) NOT NULL COMMENT '群组名称',
  `creator_id` bigint NOT NULL COMMENT '创建者ID',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '群组头像URL',
  `description` text DEFAULT NULL COMMENT '群组描述',
  `deleted` tinyint(1) NOT NULL DEFAULT 0 COMMENT '逻辑删除标记(0-未删除,1-已删除)',
  `deleted_at` datetime(6) DEFAULT NULL COMMENT '删除时间',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_groups_creator_id` (`creator_id`),
  KEY `idx_groups_deleted` (`deleted`),
  KEY `idx_groups_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='群组表';

-- 群组成员表
CREATE TABLE `group_members` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '群组成员ID',
  `group_id` bigint NOT NULL COMMENT '群组ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role` varchar(20) NOT NULL DEFAULT 'MEMBER' COMMENT '成员角色',
  `joined_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '加入时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_members_group_user` (`group_id`, `user_id`),
  KEY `idx_group_members_group_id` (`group_id`),
  KEY `idx_group_members_user_id` (`user_id`),
  KEY `idx_group_members_joined_at` (`joined_at`),
  CONSTRAINT `chk_group_members_role` CHECK (`role` in ('OWNER','ADMIN','MEMBER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='群组成员表';

SET FOREIGN_KEY_CHECKS = 1;

-- 示例初始化数据（按需启用）
-- 注意：密码为 Test123456 的 bcrypt 哈希值
-- INSERT INTO users (username, email, phone, password_hash, status)
-- VALUES (
--   'testuser',
--   'test@example.com',
--   '13800138000',
--   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
--   'OFFLINE'
-- );
