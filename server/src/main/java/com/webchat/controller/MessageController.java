package com.webchat.controller;

import com.webchat.dto.MessageDTO;
import com.webchat.dto.SendMessageRequest;
import com.webchat.entity.Message;
import com.webchat.service.MessageService;
import com.webchat.util.PermissionValidator;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
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
            @RequestParam(defaultValue = "10") int size,
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

    @GetMapping("/conversation/{conversationId}/search")
    public ResponseEntity<?> searchMessages(
            @PathVariable Long conversationId,
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            permissionValidator.validateConversationMember(userId, conversationId);
            Page<MessageDTO> messages = messageService.searchMessages(conversationId, keyword, page, size);
            return ResponseEntity.ok(messages);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/conversation/{conversationId}/search/type")
    public ResponseEntity<?> searchByType(
            @PathVariable Long conversationId,
            @RequestParam List<String> types,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            permissionValidator.validateConversationMember(userId, conversationId);
            List<Message.MessageType> messageTypes = types.stream()
                    .map(t -> Message.MessageType.valueOf(t.toUpperCase()))
                    .toList();
            Page<MessageDTO> messages = messageService.searchByType(conversationId, messageTypes, page, size);
            return ResponseEntity.ok(messages);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/conversation/{conversationId}/search/date")
    public ResponseEntity<?> searchByDate(
            @PathVariable Long conversationId,
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            permissionValidator.validateConversationMember(userId, conversationId);
            LocalDateTime start = LocalDate.parse(startDate).atStartOfDay();
            LocalDateTime end = LocalDate.parse(endDate).atTime(LocalTime.MAX);
            Page<MessageDTO> messages = messageService.searchByDateRange(conversationId, start, end, page, size);
            return ResponseEntity.ok(messages);
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/conversation/{conversationId}/search/sender")
    public ResponseEntity<?> searchBySender(
            @PathVariable Long conversationId,
            @RequestParam Long senderId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            permissionValidator.validateConversationMember(userId, conversationId);
            Page<MessageDTO> messages = messageService.searchBySender(conversationId, senderId, page, size);
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

    // 全局搜索消息（跨所有用户参与的会话）
    @GetMapping("/search/global")
    public ResponseEntity<?> globalSearchMessages(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            Page<MessageDTO> messages = messageService.globalSearchMessages(userId, keyword, page, size);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // 全局按类型搜索（图片、文件、视频）
    @GetMapping("/search/global/type")
    public ResponseEntity<?> globalSearchByType(
            @RequestParam List<String> types,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            List<Message.MessageType> messageTypes = types.stream()
                    .map(t -> Message.MessageType.valueOf(t.toUpperCase()))
                    .toList();
            Page<MessageDTO> messages = messageService.globalSearchByType(userId, messageTypes, page, size);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
