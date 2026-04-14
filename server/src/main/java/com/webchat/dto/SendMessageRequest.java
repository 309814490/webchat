package com.webchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class SendMessageRequest {
    @NotNull(message = "会话ID不能为空")
    private Long conversationId;

    @NotBlank(message = "消息内容不能为空")
    private String content;

    private String type = "TEXT";

    private Map<String, Object> metadata;

    private Long replyToId;

    // @提及相关
    private List<Long> mentionedUserIds;
    private boolean mentionAll;
}
