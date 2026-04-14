package com.webchat.service;

import com.webchat.dto.ConversationDTO;
import com.webchat.entity.*;
import com.webchat.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ConversationService {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private ConversationMemberRepository conversationMemberRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Transactional
    public Conversation getOrCreatePrivateConversation(Long userId1, Long userId2) {
        List<Conversation> existingList = conversationRepository.findPrivateConversations(userId1, userId2);

        if (!existingList.isEmpty()) {
            // 如果存在多个重复会话，返回第一个（最早创建的）
            if (existingList.size() > 1) {
                System.out.println("警告: 发现 " + existingList.size() + " 个重复的私聊会话，返回第一个");
            }
            return existingList.get(0);
        }

        // TODO: 生产环境需要启用好友验证
        // boolean isFriend = friendshipRepository.existsByUserIdAndFriendId(userId1, userId2);
        // if (!isFriend) {
        //     throw new RuntimeException("只能与好友创建私聊。请先添加对方为好友。");
        // }

        Conversation conversation = new Conversation();
        conversation.setType(Conversation.ConversationType.PRIVATE);
        conversation.setCreatedBy(userId1);
        conversation = conversationRepository.save(conversation);

        ConversationMember member1 = new ConversationMember();
        member1.setConversationId(conversation.getId());
        member1.setUserId(userId1);
        member1.setRole(ConversationMember.MemberRole.MEMBER);
        conversationMemberRepository.save(member1);

        ConversationMember member2 = new ConversationMember();
        member2.setConversationId(conversation.getId());
        member2.setUserId(userId2);
        member2.setRole(ConversationMember.MemberRole.MEMBER);
        conversationMemberRepository.save(member2);

        return conversation;
    }

    public List<ConversationDTO> getUserConversations(Long userId) {
        List<ConversationMember> memberships = conversationMemberRepository.findByUserId(userId);
        List<ConversationDTO> result = new ArrayList<>();

        // 批量获取所有会话ID
        List<Long> conversationIds = memberships.stream()
                .map(ConversationMember::getConversationId)
                .toList();

        if (conversationIds.isEmpty()) {
            return result;
        }

        // 批量查询所有会话
        List<Conversation> conversations = conversationRepository.findAllById(conversationIds);
        var conversationMap = conversations.stream()
                .collect(java.util.stream.Collectors.toMap(Conversation::getId, c -> c));

        // 批量查询所有会话的最后一条消息
        var lastMessageMap = new java.util.HashMap<Long, Message>();
        for (Long convId : conversationIds) {
            messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(convId)
                    .ifPresent(msg -> lastMessageMap.put(convId, msg));
        }

        // 批量查询所有会话的成员
        var membersByConvId = conversationMemberRepository.findByConversationIdIn(conversationIds).stream()
                .collect(java.util.stream.Collectors.groupingBy(ConversationMember::getConversationId));

        // 批量查询所有相关用户
        var allUserIds = membersByConvId.values().stream()
                .flatMap(List::stream)
                .map(ConversationMember::getUserId)
                .distinct()
                .toList();
        var userMap = userRepository.findAllById(allUserIds).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u));

        for (ConversationMember membership : memberships) {
            Conversation conversation = conversationMap.get(membership.getConversationId());
            if (conversation == null) continue;

            System.out.println("🔍 处理会话: ID=" + conversation.getId() + ", 类型=" + conversation.getType() + ", 名称=" + conversation.getName());

            ConversationDTO dto = new ConversationDTO();
            dto.setId(conversation.getId());
            dto.setType(conversation.getType().name());

            Message lastMessage = lastMessageMap.get(conversation.getId());
            if (lastMessage != null) {
                // 根据消息类型返回友好的文本标签
                String displayContent = getDisplayContent(lastMessage);
                dto.setLastMessage(displayContent);
                dto.setLastMessageTime(lastMessage.getCreatedAt());
            }

            Long unreadCount = 0L;
            if (membership.getLastReadAt() != null) {
                unreadCount = messageRepository.countUnreadMessages(conversation.getId(), userId);
                System.out.println("会话 " + conversation.getId() + " - lastReadAt: " + membership.getLastReadAt() + ", 未读数: " + unreadCount);
            } else {
                unreadCount = messageRepository.findByConversationIdOrderByCreatedAtDesc(
                        conversation.getId(), PageRequest.of(0, Integer.MAX_VALUE)).getTotalElements();
                System.out.println("会话 " + conversation.getId() + " - lastReadAt 为 null, 总消息数: " + unreadCount);
            }
            dto.setUnreadCount(unreadCount);

            if (conversation.getType() == Conversation.ConversationType.PRIVATE) {
                List<ConversationMember> members = membersByConvId.get(conversation.getId());
                if (members != null) {
                    for (ConversationMember member : members) {
                        if (!member.getUserId().equals(userId)) {
                            User otherUser = userMap.get(member.getUserId());
                            if (otherUser != null) {
                                dto.setOtherUserId(otherUser.getId());
                                dto.setOtherUsername(otherUser.getUsername());
                                dto.setOtherStudentId(otherUser.getStudentId());
                                dto.setName(otherUser.getStudentId()); // 显示学号而不是用户名
                                dto.setAvatarUrl(otherUser.getAvatarUrl());
                            }
                            break;
                        }
                    }
                }
                // 只有私聊且有消息时才添加到结果
                if (lastMessage != null) {
                    System.out.println("✅ 添加私聊会话到结果: ID=" + conversation.getId() + ", 名称=" + dto.getName());
                    result.add(dto);
                } else {
                    System.out.println("⚠️ 跳过私聊会话（无消息）: ID=" + conversation.getId());
                }
            } else {
                // 群组会话：即使没有消息也要显示
                dto.setName(conversation.getName());
                dto.setAvatarUrl(conversation.getAvatarUrl());
                System.out.println("✅ 添加群组会话到结果: ID=" + conversation.getId() + ", 名称=" + dto.getName() + ", 类型=" + conversation.getType());
                result.add(dto);
            }
        }

        result.sort((a, b) -> {
            if (a.getLastMessageTime() == null) return 1;
            if (b.getLastMessageTime() == null) return -1;
            return b.getLastMessageTime().compareTo(a.getLastMessageTime());
        });

        return result;
    }

    /**
     * 根据消息类型返回友好的显示内容
     */
    private String getDisplayContent(Message message) {
        switch (message.getType()) {
            case IMAGE:
                return "[图片]";
            case VIDEO:
                return "[视频]";
            case FILE:
                return "[文件]";
            case EMOJI:
                // 表情包直接显示原始内容（表情符号）
                return message.getContent();
            case TEXT:
            default:
                return message.getContent();
        }
    }

    @Transactional
    public void markAsRead(Long conversationId, Long userId) {
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("不是会话成员"));

        System.out.println("标记已读 - 会话ID: " + conversationId + ", 用户ID: " + userId);
        System.out.println("更新前 lastReadAt: " + member.getLastReadAt());

        member.setLastReadAt(LocalDateTime.now());
        conversationMemberRepository.save(member);

        System.out.println("更新后 lastReadAt: " + member.getLastReadAt());
    }

    public int getConversationMemberCount(Long conversationId) {
        System.out.println("🔍 获取会话成员数量 - 会话ID: " + conversationId);
        List<ConversationMember> members = conversationMemberRepository.findByConversationId(conversationId);
        System.out.println("✅ 会话成员列表: " + members.size() + " 个成员");
        for (ConversationMember member : members) {
            System.out.println("  - 用户ID: " + member.getUserId() + ", 角色: " + member.getRole());
        }
        return members.size();
    }

    public List<Map<String, Object>> getConversationMembers(Long conversationId) {
        List<ConversationMember> members = conversationMemberRepository.findByConversationId(conversationId);
        List<Long> userIds = members.stream().map(ConversationMember::getUserId).toList();
        var users = userRepository.findAllById(userIds);

        return users.stream().map(user -> {
            var memberInfo = members.stream()
                .filter(m -> m.getUserId().equals(user.getId()))
                .findFirst()
                .orElse(null);

            Map<String, Object> memberData = new HashMap<>();
            memberData.put("id", user.getId());
            memberData.put("username", user.getUsername());
            memberData.put("studentId", user.getStudentId() != null ? user.getStudentId() : "");
            memberData.put("avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "");
            memberData.put("role", memberInfo != null ? memberInfo.getRole().name() : "MEMBER");
            return memberData;
        }).collect(Collectors.toList());
    }
}