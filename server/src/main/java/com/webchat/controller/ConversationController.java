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
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            Long friendId = body.get("friendId");
            if (friendId == null) {
                throw new RuntimeException("friendId 不能为空");
            }
            var conversation = conversationService.getOrCreatePrivateConversation(userId, friendId);
            return ResponseEntity.ok(conversation);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{conversationId}/members/count")
    public ResponseEntity<?> getConversationMemberCount(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long conversationId) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(authHeader.replace("Bearer ", ""));
            permissionValidator.validateConversationMember(userId, conversationId);
            int count = conversationService.getConversationMemberCount(conversationId);
            return ResponseEntity.ok(Map.of("count", count));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{conversationId}/members")
    public ResponseEntity<?> getConversationMembers(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long conversationId) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(authHeader.replace("Bearer ", ""));
            permissionValidator.validateConversationMember(userId, conversationId);
            var members = conversationService.getConversationMembers(conversationId);
            return ResponseEntity.ok(members);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{conversationId}/pin")
    public ResponseEntity<?> pinConversation(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            permissionValidator.validateConversationMember(userId, conversationId);
            conversationService.pinConversation(conversationId, userId);
            return ResponseEntity.ok(Map.of("message", "已置顶"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{conversationId}/unpin")
    public ResponseEntity<?> unpinConversation(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            permissionValidator.validateConversationMember(userId, conversationId);
            conversationService.unpinConversation(conversationId, userId);
            return ResponseEntity.ok(Map.of("message", "已取消置顶"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{conversationId}/settings")
    public ResponseEntity<?> getGroupSettings(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            permissionValidator.validateConversationMember(userId, conversationId);
            return ResponseEntity.ok(conversationService.getGroupSettings(conversationId));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{conversationId}/mute")
    public ResponseEntity<?> muteConversation(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            permissionValidator.validateConversationMember(userId, conversationId);
            conversationService.muteConversation(conversationId, userId);
            return ResponseEntity.ok(Map.of("message", "已开启免打扰"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{conversationId}/unmute")
    public ResponseEntity<?> unmuteConversation(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            permissionValidator.validateConversationMember(userId, conversationId);
            conversationService.unmuteConversation(conversationId, userId);
            return ResponseEntity.ok(Map.of("message", "已关闭免打扰"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{conversationId}/hide")
    public ResponseEntity<?> hideConversation(
            @RequestHeader("Authorization") String token,
            @PathVariable Long conversationId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            permissionValidator.validateConversationMember(userId, conversationId);
            conversationService.hideConversation(conversationId, userId);
            return ResponseEntity.ok(Map.of("message", "已删除会话"));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
