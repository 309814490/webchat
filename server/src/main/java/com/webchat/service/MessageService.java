package com.webchat.service;

import com.webchat.dto.MessageDTO;
import com.webchat.dto.SendMessageRequest;
import com.webchat.entity.Message;
import com.webchat.repository.MessageRepository;
import com.webchat.repository.UserRepository;
import com.webchat.repository.ConversationMemberRepository;
import com.webchat.repository.BlacklistRepository;
import com.webchat.repository.ConversationRepository;
import com.webchat.entity.Conversation;
import com.webchat.entity.ConversationMember;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ConversationMemberRepository conversationMemberRepository;

    @Autowired
    private BlacklistRepository blacklistRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public MessageDTO sendMessage(Long senderId, SendMessageRequest request) {
        // 检查群禁言
        Conversation conversation = conversationRepository.findById(request.getConversationId()).orElse(null);
        if (conversation != null && conversation.getType() == Conversation.ConversationType.GROUP) {
            var senderMember = conversationMemberRepository
                    .findByConversationIdAndUserId(request.getConversationId(), senderId)
                    .orElseThrow(() -> new SecurityException("无权访问该会话"));

            // 全员禁言检查（群主和管理员不受限制）
            if (Boolean.TRUE.equals(conversation.getMuteAll())
                    && senderMember.getRole() == ConversationMember.MemberRole.MEMBER) {
                throw new RuntimeException("当前群组已开启全员禁言");
            }

            // 个人禁言检查
            if (senderMember.getMutedUntil() != null
                    && senderMember.getMutedUntil().isAfter(java.time.LocalDateTime.now())) {
                throw new RuntimeException("您已被禁言，无法发送消息");
            }
        }

        // 私聊黑名单检查
        if (conversation != null && conversation.getType() == Conversation.ConversationType.PRIVATE) {
            var members = conversationMemberRepository.findByConversationId(request.getConversationId());
            for (var m : members) {
                if (!m.getUserId().equals(senderId)) {
                    if (blacklistRepository.existsByUserIdAndBlockedUserId(m.getUserId(), senderId)) {
                        throw new RuntimeException("消息发送失败");
                    }
                    break;
                }
            }
        }

        // 验证@所有人权限：只有群主或管理员可以@所有人
        if (request.isMentionAll()) {
            var member = conversationMemberRepository
                    .findByConversationIdAndUserId(request.getConversationId(), senderId)
                    .orElseThrow(() -> new SecurityException("无权访问该会话"));
            if (member.getRole() != ConversationMember.MemberRole.OWNER
                    && member.getRole() != ConversationMember.MemberRole.ADMIN) {
                throw new SecurityException("只有群主或管理员可以@所有人");
            }
        }

        Message message = new Message();
        message.setConversationId(request.getConversationId());
        message.setSenderId(senderId);
        message.setContent(request.getContent());
        message.setType(Message.MessageType.valueOf(request.getType()));

        // 合并 metadata：将原有 metadata 和提及信息合并
        Map<String, Object> mergedMetadata = new java.util.HashMap<>();
        if (request.getMetadata() != null) {
            mergedMetadata.putAll(request.getMetadata());
        }
        if (request.getMentionedUserIds() != null && !request.getMentionedUserIds().isEmpty()) {
            mergedMetadata.put("mentionedUserIds", request.getMentionedUserIds());
        }
        if (request.isMentionAll()) {
            mergedMetadata.put("mentionAll", true);
        }
        if (!mergedMetadata.isEmpty()) {
            try {
                message.setMetadata(objectMapper.writeValueAsString(mergedMetadata));
            } catch (Exception e) {
                message.setMetadata(null);
            }
        }

        // 设置回复消息ID
        if (request.getReplyToId() != null) {
            message.setReplyToId(request.getReplyToId());
        }

        message = messageRepository.save(message);

        MessageDTO messageDTO = convertToDTO(message);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + request.getConversationId(),
                messageDTO
        );

        return messageDTO;
    }

    public Page<MessageDTO> getMessages(Long conversationId, int page, int size) {
        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.findByConversationIdOrderByCreatedAtDesc(conversationId, pageable);
        return convertPageToDTO(conversationId, messagePage);
    }

    public Page<MessageDTO> searchMessages(Long conversationId, String keyword, int page, int size) {
        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.searchMessages(conversationId, keyword, pageable);
        return convertPageToDTO(conversationId, messagePage);
    }

    public Page<MessageDTO> searchByType(Long conversationId, List<Message.MessageType> types, int page, int size) {
        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.findByConversationIdAndTypeIn(conversationId, types, pageable);
        return convertPageToDTO(conversationId, messagePage);
    }

    public Page<MessageDTO> searchByDateRange(Long conversationId, java.time.LocalDateTime startDate, java.time.LocalDateTime endDate, int page, int size) {
        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.findByConversationIdAndDateRange(conversationId, startDate, endDate, pageable);
        return convertPageToDTO(conversationId, messagePage);
    }

    public Page<MessageDTO> searchBySender(Long conversationId, Long senderId, int page, int size) {
        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.findByConversationIdAndSenderId(conversationId, senderId, pageable);
        return convertPageToDTO(conversationId, messagePage);
    }

    // 全局搜索消息（跨用户所有会话）
    public Page<MessageDTO> globalSearchMessages(Long userId, String keyword, int page, int size) {
        size = Math.min(size, 100);
        List<Long> conversationIds = conversationMemberRepository.findByUserId(userId).stream()
                .map(member -> member.getConversationId())
                .toList();
        if (conversationIds.isEmpty()) {
            return Page.empty();
        }
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.globalSearchMessages(conversationIds, keyword, pageable);
        return convertGlobalPageToDTO(messagePage);
    }

    // 全局按类型搜索
    public Page<MessageDTO> globalSearchByType(Long userId, List<Message.MessageType> types, int page, int size) {
        size = Math.min(size, 100);
        List<Long> conversationIds = conversationMemberRepository.findByUserId(userId).stream()
                .map(member -> member.getConversationId())
                .toList();
        if (conversationIds.isEmpty()) {
            return Page.empty();
        }
        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messagePage = messageRepository.globalSearchByType(conversationIds, types, pageable);
        return convertGlobalPageToDTO(messagePage);
    }

    // 全局搜索的 DTO 转换（不依赖单个 conversationId）
    private Page<MessageDTO> convertGlobalPageToDTO(Page<Message> messagePage) {
        var senderIds = messagePage.getContent().stream()
                .map(Message::getSenderId)
                .distinct()
                .toList();

        var senderMap = userRepository.findAllById(senderIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                    user -> user.getId(),
                    user -> user
                ));

        return messagePage.map(message -> {
            MessageDTO dto = new MessageDTO();
            dto.setId(message.getId());
            dto.setConversationId(message.getConversationId());
            dto.setSenderId(message.getSenderId());
            dto.setContent(message.getContent());
            dto.setType(message.getType());
            dto.setCreatedAt(message.getCreatedAt());
            dto.setRecalled(message.getRecalled());

            if (message.getMetadata() != null) {
                try {
                    dto.setMetadata(objectMapper.readValue(message.getMetadata(),
                            new TypeReference<Map<String, Object>>() {}));
                } catch (Exception e) {
                    dto.setMetadata(null);
                }
            }

            var sender = senderMap.get(message.getSenderId());
            if (sender != null) {
                dto.setSenderName(sender.getUsername());
                dto.setSenderStudentId(sender.getStudentId());
                dto.setSenderAvatarUrl(sender.getAvatarUrl());
            }

            return dto;
        });
    }

    private Page<MessageDTO> convertPageToDTO(Long conversationId, Page<Message> messagePage) {
        var senderIds = messagePage.getContent().stream()
                .map(Message::getSenderId)
                .distinct()
                .toList();

        var senderMap = userRepository.findAllById(senderIds).stream()
                .collect(java.util.stream.Collectors.toMap(
                    user -> user.getId(),
                    user -> user
                ));

        var memberRoleMap = conversationMemberRepository.findByConversationId(conversationId).stream()
                .collect(java.util.stream.Collectors.toMap(
                    member -> member.getUserId(),
                    member -> member.getRole().name()
                ));

        var replyToIds = messagePage.getContent().stream()
                .map(Message::getReplyToId)
                .filter(id -> id != null)
                .distinct()
                .toList();

        var replyMessageMap = replyToIds.isEmpty()
                ? java.util.Collections.<Long, Message>emptyMap()
                : messageRepository.findAllById(replyToIds).stream()
                    .collect(java.util.stream.Collectors.toMap(Message::getId, m -> m));

        var replySenderIds = replyMessageMap.values().stream()
                .map(Message::getSenderId)
                .filter(id -> !senderMap.containsKey(id))
                .distinct()
                .toList();
        var replySenderMap = new java.util.HashMap<>(senderMap);
        if (!replySenderIds.isEmpty()) {
            userRepository.findAllById(replySenderIds).forEach(user -> replySenderMap.put(user.getId(), user));
        }

        return messagePage.map(message -> convertToDTO(message, replySenderMap, memberRoleMap, replyMessageMap));
    }

    private MessageDTO convertToDTO(Message message) {
        // 构建单条消息的批量查询 Map，避免 N+1
        var sender = userRepository.findById(message.getSenderId()).orElse(null);
        var senderMap = new java.util.HashMap<Long, com.webchat.entity.User>();
        if (sender != null) {
            senderMap.put(sender.getId(), sender);
        }

        var memberRoleMap = new java.util.HashMap<Long, String>();
        conversationMemberRepository.findByConversationIdAndUserId(message.getConversationId(), message.getSenderId())
                .ifPresent(member -> memberRoleMap.put(member.getUserId(), member.getRole().name()));

        var replyMessageMap = new java.util.HashMap<Long, Message>();
        if (message.getReplyToId() != null) {
            messageRepository.findById(message.getReplyToId()).ifPresent(replyMsg -> {
                replyMessageMap.put(replyMsg.getId(), replyMsg);
                if (!senderMap.containsKey(replyMsg.getSenderId())) {
                    userRepository.findById(replyMsg.getSenderId()).ifPresent(u -> senderMap.put(u.getId(), u));
                }
            });
        }

        return convertToDTO(message, senderMap, memberRoleMap, replyMessageMap);
    }

    @SuppressWarnings("unchecked")
    private void populateMentionInfo(MessageDTO dto) {
        Map<String, Object> metadata = dto.getMetadata();
        if (metadata == null) return;

        Object mentionAll = metadata.get("mentionAll");
        if (Boolean.TRUE.equals(mentionAll)) {
            dto.setMentionAll(true);
        }

        Object mentionedIds = metadata.get("mentionedUserIds");
        if (mentionedIds instanceof List) {
            dto.setMentionedUserIds(((List<Object>) mentionedIds).stream()
                    .map(id -> id instanceof Number ? ((Number) id).longValue() : Long.parseLong(id.toString()))
                    .toList());
        }
    }

    private MessageDTO convertToDTO(Message message, java.util.Map<Long, com.webchat.entity.User> senderMap,
                                     java.util.Map<Long, String> memberRoleMap,
                                     java.util.Map<Long, Message> replyMessageMap) {
        MessageDTO dto = new MessageDTO();
        dto.setId(message.getId());
        dto.setConversationId(message.getConversationId());
        dto.setSenderId(message.getSenderId());
        dto.setContent(message.getContent());
        dto.setType(message.getType());

        if (message.getMetadata() != null) {
            try {
                dto.setMetadata(objectMapper.readValue(message.getMetadata(),
                        new TypeReference<Map<String, Object>>() {}));
            } catch (Exception e) {
                dto.setMetadata(null);
            }
        }

        dto.setCreatedAt(message.getCreatedAt());

        var sender = senderMap.get(message.getSenderId());
        if (sender != null) {
            dto.setSenderName(sender.getUsername());
            dto.setSenderStudentId(sender.getStudentId());
            dto.setSenderAvatarUrl(sender.getAvatarUrl());
        }

        // 设置发送者角色
        dto.setSenderRole(memberRoleMap.get(message.getSenderId()));

        // 填充回复消息信息
        if (message.getReplyToId() != null) {
            dto.setReplyToId(message.getReplyToId());
            Message replyMsg = replyMessageMap.get(message.getReplyToId());
            if (replyMsg != null) {
                dto.setReplyToContent(replyMsg.getContent());
                dto.setReplyToType(replyMsg.getType());
                var replySender = senderMap.get(replyMsg.getSenderId());
                if (replySender != null) {
                    dto.setReplyToSenderName(replySender.getUsername());
                    dto.setReplyToSenderStudentId(replySender.getStudentId());
                }
            }
        }

        // 填充@提及信息
        populateMentionInfo(dto);

        // 撤回消息处理
        maskIfRecalled(dto, message);

        return dto;
    }

    private void maskIfRecalled(MessageDTO dto, Message message) {
        if (Boolean.TRUE.equals(message.getRecalled())) {
            dto.setRecalled(true);
            dto.setContent("[消息已撤回]");
            dto.setType(Message.MessageType.TEXT);
            dto.setMetadata(null);
            dto.setReplyToId(null);
            dto.setReplyToContent(null);
            dto.setReplyToSenderName(null);
            dto.setReplyToSenderStudentId(null);
            dto.setReplyToType(null);
            dto.setMentionedUserIds(null);
            dto.setMentionAll(false);
        }
    }

    @Transactional
    public MessageDTO recallMessage(Long messageId, Long operatorId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("消息不存在"));

        if (Boolean.TRUE.equals(message.getRecalled())) {
            throw new RuntimeException("消息已被撤回");
        }

        var member = conversationMemberRepository
                .findByConversationIdAndUserId(message.getConversationId(), operatorId)
                .orElseThrow(() -> new SecurityException("无权访问该会话"));

        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        long minutesSinceSent = java.time.Duration.between(message.getCreatedAt(), now).toMinutes();

        boolean isSender = operatorId.equals(message.getSenderId());
        boolean isAdminOrOwner = member.getRole() == com.webchat.entity.ConversationMember.MemberRole.OWNER
                || member.getRole() == com.webchat.entity.ConversationMember.MemberRole.ADMIN;

        if (isSender && minutesSinceSent <= 5) {
            // 发送者5分钟内可撤回
        } else if (isAdminOrOwner && minutesSinceSent <= 60) {
            // 管理员/群主1小时内可撤回
        } else if (isSender) {
            throw new RuntimeException("已超过5分钟撤回时限");
        } else if (isAdminOrOwner) {
            throw new RuntimeException("已超过1小时撤回时限");
        } else {
            throw new SecurityException("无权撤回该消息");
        }

        message.setRecalled(true);
        messageRepository.save(message);

        MessageDTO dto = convertToDTO(message);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + message.getConversationId(),
                dto
        );

        return dto;
    }

    // ===== 消息转发 =====

    @Transactional
    public List<MessageDTO> forwardMessage(Long messageId, Long senderId, List<Long> targetConversationIds) {
        Message original = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("消息不存在"));

        if (Boolean.TRUE.equals(original.getRecalled())) {
            throw new RuntimeException("已撤回的消息不能转发");
        }

        List<MessageDTO> results = new java.util.ArrayList<>();
        for (Long targetConversationId : targetConversationIds) {
            // 验证发送者是目标会话成员
            if (!conversationMemberRepository.existsByConversationIdAndUserId(targetConversationId, senderId)) {
                continue;
            }

            Message forwarded = new Message();
            forwarded.setConversationId(targetConversationId);
            forwarded.setSenderId(senderId);
            forwarded.setContent(original.getContent());
            forwarded.setType(original.getType());

            // 在 metadata 中标记为转发消息
            Map<String, Object> forwardMeta = new java.util.HashMap<>();
            if (original.getMetadata() != null) {
                try {
                    forwardMeta.putAll(objectMapper.readValue(original.getMetadata(),
                            new TypeReference<Map<String, Object>>() {}));
                } catch (Exception ignored) {}
            }
            forwardMeta.put("forwarded", true);
            forwardMeta.put("originalMessageId", original.getId());
            try {
                forwarded.setMetadata(objectMapper.writeValueAsString(forwardMeta));
            } catch (Exception ignored) {}

            forwarded = messageRepository.save(forwarded);
            MessageDTO dto = convertToDTO(forwarded);

            messagingTemplate.convertAndSend(
                    "/topic/conversation/" + targetConversationId,
                    dto
            );
            results.add(dto);
        }
        return results;
    }
}
