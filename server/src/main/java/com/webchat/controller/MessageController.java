package com.webchat.controller;

import com.webchat.dto.MessageDTO;
import com.webchat.dto.SendMessageRequest;
import com.webchat.service.MessageService;
import com.webchat.util.PermissionValidator;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private MessageService messageService;

    @Autowired
    private PermissionValidator permissionValidator;

    @PostMapping
    public ResponseEntity<?> sendMessage(
            @Valid @RequestBody SendMessageRequest request,
            Authentication authentication) {
        try {
            Long senderId = (Long) authentication.getPrincipal();
            // 验证用户是否是会话成员
            permissionValidator.validateConversationMember(senderId, request.getConversationId());
            MessageDTO message = messageService.sendMessage(senderId, request);
            return ResponseEntity.ok(message);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/conversation/{conversationId}")
    public ResponseEntity<?> getMessages(
            @PathVariable Long conversationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            // 验证用户是否是会话成员
            permissionValidator.validateConversationMember(userId, conversationId);
            Page<MessageDTO> messages = messageService.getMessages(conversationId, page, size);
            return ResponseEntity.ok(messages);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{messageId}/recall")
    public ResponseEntity<?> recallMessage(
            @PathVariable Long messageId,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            MessageDTO result = messageService.recallMessage(messageId, userId);
            return ResponseEntity.ok(result);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
