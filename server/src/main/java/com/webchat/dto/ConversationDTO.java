package com.webchat.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ConversationDTO {
    private Long id;
    private String type; // "PRIVATE" or "GROUP"
    private String name;
    private String avatarUrl;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
    private Long unreadCount;
    private Long otherUserId; // For private conversations
    private String otherUsername; // For private conversations
    private String otherStudentId; // For private conversations - 好友学号
    private Boolean pinned = false; // 是否置顶
}
