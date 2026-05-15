package com.webchat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webchat.entity.UserSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class MessageSyncService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private UserSessionService userSessionService;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * 向用户的所有在线设备推送消息
     */
    public void syncMessageToAllDevices(Long userId, Object message) {
        List<UserSession> onlineSessions = userSessionService.getOnlineSessions(userId);

        for (UserSession session : onlineSessions) {
            try {
                // 发送到用户的个人频道
                messagingTemplate.convertAndSend(
                        "/topic/user/" + userId + "/sync",
                        message
                );
            } catch (Exception e) {
                System.err.println("Failed to sync message to device: " + session.getDeviceId());
            }
        }
    }

    /**
     * 同步已读状态到所有设备
     */
    public void syncReadStatus(Long userId, Long conversationId, Long messageId) {
        Map<String, Object> syncData = Map.of(
                "type", "READ_STATUS",
                "conversationId", conversationId,
                "messageId", messageId,
                "timestamp", System.currentTimeMillis()
        );

        syncMessageToAllDevices(userId, syncData);
    }

    /**
     * 同步会话状态（置顶、免打扰等）
     */
    public void syncConversationStatus(Long userId, Long conversationId, String action, Object data) {
        Map<String, Object> syncData = Map.of(
                "type", "CONVERSATION_STATUS",
                "conversationId", conversationId,
                "action", action,
                "data", data,
                "timestamp", System.currentTimeMillis()
        );

        syncMessageToAllDevices(userId, syncData);
    }

    /**
     * 同步用户状态（在线、离线）
     */
    public void syncUserStatus(Long userId, String status) {
        Map<String, Object> syncData = Map.of(
                "type", "USER_STATUS",
                "userId", userId,
                "status", status,
                "timestamp", System.currentTimeMillis()
        );

        // 广播给所有好友
        messagingTemplate.convertAndSend("/topic/user-status/" + userId, syncData);
    }

    /**
     * 同步消息删除
     */
    public void syncMessageDelete(Long userId, Long conversationId, Long messageId) {
        Map<String, Object> syncData = Map.of(
                "type", "MESSAGE_DELETE",
                "conversationId", conversationId,
                "messageId", messageId,
                "timestamp", System.currentTimeMillis()
        );

        syncMessageToAllDevices(userId, syncData);
    }

    /**
     * 同步会话删除
     */
    public void syncConversationDelete(Long userId, Long conversationId) {
        Map<String, Object> syncData = Map.of(
                "type", "CONVERSATION_DELETE",
                "conversationId", conversationId,
                "timestamp", System.currentTimeMillis()
        );

        syncMessageToAllDevices(userId, syncData);
    }
}
