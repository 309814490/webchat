package com.webchat.controller;

import com.webchat.dto.ConversationDTO;
import com.webchat.security.JwtTokenProvider;
import com.webchat.service.ConversationService;
import com.webchat.util.PermissionValidator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    @Autowired
    private ConversationService conversationService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PermissionValidator permissionValidator;

    @GetMapping("/list")
    public ResponseEntity<?> getUserConversations(@RequestHeader("Authorization") String token) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            List<ConversationDTO> conversations = conversationService.getUserConversations(userId);
            return ResponseEntity.ok(conversations);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{conversationId}/read")
    public ResponseEntity<?> markAsRead(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            // 验证用户是否是会话成员
            permissionValidator.validateConversationMember(userId, conversationId);
            conversationService.markAsRead(conversationId, userId);
            return ResponseEntity.ok(Map.of("message", "已标记为已读"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/private")
    public ResponseEntity<?> getOrCreatePrivateConversation(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Long> body
    ) {
        try {
            System.out.println("收到创建私聊请求，body: " + body);
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            Long friendId = body.get("friendId");
            System.out.println("当前用户ID: " + userId + ", 好友ID: " + friendId);

            if (friendId == null) {
                throw new RuntimeException("friendId 不能为空");
            }

            var conversation = conversationService.getOrCreatePrivateConversation(userId, friendId);
            System.out.println("会话创建成功，ID: " + conversation.getId());
            return ResponseEntity.ok(conversation);
        } catch (Exception e) {
            System.err.println("创建会话失败: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{conversationId}/members/count")
    public ResponseEntity<?> getConversationMemberCount(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long conversationId) {
        try {
            System.out.println("🔍 收到获取会话成员数量请求 - 会话ID: " + conversationId);
            Long userId = jwtTokenProvider.getUserIdFromToken(authHeader.replace("Bearer ", ""));

            // 验证用户是否是会话成员
            permissionValidator.validateConversationMember(userId, conversationId);

            int count = conversationService.getConversationMemberCount(conversationId);
            System.out.println("✅ 返回成员数量: " + count);
            return ResponseEntity.ok(Map.of("count", count));
        } catch (SecurityException e) {
            System.err.println("❌ 权限验证失败: " + e.getMessage());
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            System.err.println("❌ 获取会话成员数量失败: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{conversationId}/members")
    public ResponseEntity<?> getConversationMembers(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long conversationId) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(authHeader.replace("Bearer ", ""));

            // 验证用户是否是会话成员
            permissionValidator.validateConversationMember(userId, conversationId);

            var members = conversationService.getConversationMembers(conversationId);
            return ResponseEntity.ok(members);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
