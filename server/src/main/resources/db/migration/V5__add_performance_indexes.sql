-- Friendship: 加速好友列表查询和双向关系校验
CREATE UNIQUE INDEX IF NOT EXISTS idx_friendship_user_friend ON friendships(user_id, friend_id);
CREATE INDEX IF NOT EXISTS idx_friendship_friend_id ON friendships(friend_id);

-- FriendRequest: 加速好友请求查询
CREATE INDEX IF NOT EXISTS idx_fr_from_to ON friend_requests(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_fr_to_status ON friend_requests(to_user_id, status);

-- GroupMember: 加速群成员查询
CREATE UNIQUE INDEX IF NOT EXISTS idx_gm_group_user ON group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_gm_user_id ON group_members(user_id);

-- User.phone: 添加唯一索引以加速按手机号搜索
ALTER TABLE users ADD UNIQUE INDEX idx_user_phone (phone);
