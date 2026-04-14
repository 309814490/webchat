package com.webchat.security;

import com.webchat.repository.ConversationMemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * WebSocket 订阅权限拦截器
 * 防止用户订阅不属于自己的会话消息
 */
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    @Autowired
    private ConversationMemberRepository conversationMemberRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) return message;

        // CONNECT 时从 header 中提取 JWT 并设置用户身份
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtTokenProvider.validateToken(token)) {
                    Long userId = jwtTokenProvider.getUserIdFromToken(token);
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(userId, null, java.util.Collections.emptyList());
                    accessor.setUser(auth);
                }
            }
        }

        // SUBSCRIBE 时验证用户是否有权限订阅该会话
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/topic/conversation/")) {
                Long userId = getUserId(accessor);
                if (userId == null) {
                    throw new SecurityException("未认证，无法订阅");
                }

                try {
                    String convIdStr = destination.replace("/topic/conversation/", "");
                    Long conversationId = Long.parseLong(convIdStr);

                    boolean isMember = conversationMemberRepository
                            .findByConversationIdAndUserId(conversationId, userId)
                            .isPresent();

                    if (!isMember) {
                        System.err.println("❌ 用户 " + userId + " 尝试订阅不属于自己的会话 " + conversationId);
                        throw new SecurityException("无权订阅该会话");
                    }
                } catch (NumberFormatException e) {
                    throw new SecurityException("无效的会话ID");
                }
            }
        }

        return message;
    }

    private Long getUserId(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof UsernamePasswordAuthenticationToken auth) {
            Object principal = auth.getPrincipal();
            if (principal instanceof Long) return (Long) principal;
        }
        return null;
    }
}
