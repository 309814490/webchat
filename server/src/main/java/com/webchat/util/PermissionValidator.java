package com.webchat.util;

import com.webchat.entity.ConversationMember;
import com.webchat.repository.ConversationMemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 权限校验工具类
 * 用于验证用户是否有权限访问特定资源
 */
@Component
public class PermissionValidator {

    @Autowired
    private ConversationMemberRepository conversationMemberRepository;

    /**
     * 验证用户是否是会话成员
     * @param userId 用户ID
     * @param conversationId 会话ID
     * @throws SecurityException 如果用户不是会话成员
     */
    public void validateConversationMember(Long userId, Long conversationId) {
        boolean isMember = conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, userId)
                .isPresent();

        if (!isMember) {
            throw new SecurityException("无权访问该会话");
        }
    }

    /**
     * 验证用户是否是会话管理员或群主
     * @param userId 用户ID
     * @param conversationId 会话ID
     * @throws SecurityException 如果用户不是管理员或群主
     */
    public void validateConversationAdmin(Long userId, Long conversationId) {
        ConversationMember member = conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new SecurityException("无权访问该会话"));

        if (member.getRole() != ConversationMember.MemberRole.OWNER
                && member.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new SecurityException("需要管理员权限");
        }
    }

    /**
     * 检查用户是否是会话成员（不抛出异常）
     * @param userId 用户ID
     * @param conversationId 会话ID
     * @return 是否是会话成员
     */
    public boolean isConversationMember(Long userId, Long conversationId) {
        return conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, userId)
                .isPresent();
    }
}
