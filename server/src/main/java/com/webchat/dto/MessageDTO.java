package com.webchat.dto;

import com.webchat.entity.Message;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class MessageDTO {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private String senderName;
    private String senderStudentId;
    private String senderAvatarUrl;
    private String senderRole; // 发送者在群组中的角色：OWNER, ADMIN, MEMBER
    private String content;
    private Message.MessageType type;
    private Map<String, Object> metadata;
    private LocalDateTime createdAt;
    private boolean read;

    // 回复相关字段
    private Long replyToId;
    private String replyToContent;
    private String replyToSenderName;
    private String replyToSenderStudentId;
    private Message.MessageType replyToType;

    // @提及相关字段
    private List<Long> mentionedUserIds;
    private boolean mentionAll;

    // 撤回相关字段
    private boolean recalled;
}
