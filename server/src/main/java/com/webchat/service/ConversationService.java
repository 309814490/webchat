package com.webchat.service;

import com.webchat.dto.ConversationDTO;
import com.webchat.entity.*;
import com.webchat.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ConversationService {

    private static final Logger log = LoggerFactory.getLogger(ConversationService.class);

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
            if (existingList.size() > 1) {
                log.warn("发现 {} 个重复的私聊会话，返回第一个", existingList.size());
            }
            return existingList.get(0);
        }

        Conversation conversation = new Conversation();
        conversation.setType(Conversation.ConversationType.PRIVATE);
        conversation.setCreatedBy(userId1);
        conversation = conversationRepository.save(conversation);

        ConversationMember member1 = new ConversationMember();
        member1.setConversationId(conversation.getId());
        member1.setUserId(userId1);
        member1.setRole(ConversationMember.MemberRole.MEMBER);

        ConversationMember member2 = new ConversationMember();
        member2.setConversationId(conversation.getId());
        member2.setUserId(userId2);
        member2.setRole(ConversationMember.MemberRole.MEMBER);

        conversationMemberRepository.saveAll(List.of(member1, member2));

        return conversation;
    }

    public List<ConversationDTO> getUserConversations(Long userId) {
        List<ConversationMember> memberships = conversationMemberRepository.findByUserId(userId);
        List<ConversationDTO> result = new ArrayList<>();

        List<Long> conversationIds = memberships.stream()
                .map(ConversationMember::getConversationId)
                .toList();

        if (conversationIds.isEmpty()) {
            return result;
        }

        List<Conversation> conversations = conversationRepository.findAllById(conversationIds);
        var conversationMap = conversations.stream()
                .collect(Collectors.toMap(Conversation::getId, c -> c));

        // 批量获取每个会话的最后一条消息（1次查询替代N次）
        var lastMessageMap = messageRepository.findLastMessageByConversationIdIn(conversationIds).stream()
                .collect(Collectors.toMap(Message::getConversationId, m -> m));

        // 批量统计每个会话的未读数（1次查询替代N次）
        var unreadCountMap = new HashMap<Long, Long>();
        for (Object[] row : messageRepository.countUnreadByConversationIds(conversationIds, userId)) {
            unreadCountMap.put((Long) row[0], (Long) row[1]);
        }

        var membersByConvId = conversationMemberRepository.findByConversationIdIn(conversationIds).stream()
                .collect(Collectors.groupingBy(ConversationMember::getConversationId));

        var allUserIds = membersByConvId.values().stream()
                .flatMap(List::stream)
                .map(ConversationMember::getUserId)
                .distinct()
                .toList();
        var userMap = userRepository.findAllById(allUserIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        for (ConversationMember membership : memberships) {
            Conversation conversation = conversationMap.get(membership.getConversationId());
            if (conversation == null) continue;

            ConversationDTO dto = new ConversationDTO();
            dto.setId(conversation.getId());
            dto.setType(conversation.getType().name());
            dto.setPinned(membership.getPinned() != null && membership.getPinned());

            Message lastMessage = lastMessageMap.get(conversation.getId());
            if (lastMessage != null) {
                String displayContent = getDisplayContent(lastMessage);
                dto.setLastMessage(displayContent);
                dto.setLastMessageTime(lastMessage.getCreatedAt());
            }

            dto.setUnreadCount(unreadCountMap.getOrDefault(conversation.getId(), 0L));

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
                                dto.setName(otherUser.getStudentId());
                                dto.setAvatarUrl(otherUser.getAvatarUrl());
                            }
                            break;
                        }
                    }
                }
                if (lastMessage != null) {
                    result.add(dto);
                }
            } else {
                dto.setName(conversation.getName());
                dto.setAvatarUrl(conversation.getAvatarUrl());
                result.add(dto);
            }
        }

        // Sort: pinned first, then by lastMessageTime desc
        result.sort((a, b) -> {
            boolean aPinned = a.getPinned() != null && a.getPinned();
            boolean bPinned = b.getPinned() != null && b.getPinned();
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            if (a.getLastMessageTime() == null) return 1;
            if (b.getLastMessageTime() == null) return -1;
            return b.getLastMessageTime().compareTo(a.getLastMessageTime());
        });

        return result;
    }

    private String getDisplayContent(Message message) {
        switch (message.getType()) {
            case IMAGE:
                return "[图片]";
            case VIDEO:
                return "[视频]";
            case FILE:
                return "[文件]";
            case EMOJI:
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
        member.setLastReadAt(LocalDateTime.now());
        conversationMemberRepository.save(member);
    }

    @Transactional
    public void pinConversation(Long conversationId, Long userId) {
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("不是会话成员"));
        member.setPinned(true);
        member.setPinnedAt(LocalDateTime.now());
        conversationMemberRepository.save(member);
    }

    @Transactional
    public void unpinConversation(Long conversationId, Long userId) {
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("不是会话成员"));
        member.setPinned(false);
        member.setPinnedAt(null);
        conversationMemberRepository.save(member);
    }

    public int getConversationMemberCount(Long conversationId) {
        return (int) conversationMemberRepository.countByConversationId(conversationId);
    }

    public List<Map<String, Object>> getConversationMembers(Long conversationId) {
        List<ConversationMember> members = conversationMemberRepository.findByConversationId(conversationId);
        // 预先建立 Map，避免 O(N²) 的 Stream.filter 嵌套查找
        Map<Long, ConversationMember> memberMap = members.stream()
                .collect(Collectors.toMap(ConversationMember::getUserId, m -> m));

        List<Long> userIds = members.stream().map(ConversationMember::getUserId).toList();
        var users = userRepository.findAllById(userIds);

        return users.stream().map(user -> {
            var memberInfo = memberMap.get(user.getId());

            Map<String, Object> memberData = new HashMap<>();
            memberData.put("id", user.getId());
            memberData.put("username", user.getUsername());
            memberData.put("studentId", user.getStudentId() != null ? user.getStudentId() : "");
            memberData.put("avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "");
            memberData.put("role", memberInfo != null ? memberInfo.getRole().name() : "MEMBER");
            return memberData;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getConversationMembersWithPrivacy(Long conversationId, Long requesterId) {
        List<ConversationMember> members = conversationMemberRepository.findByConversationId(conversationId);
        // 预先建立 Map，避免 O(N²) 的 Stream.filter 嵌套查找
        Map<Long, ConversationMember> memberMap = members.stream()
                .collect(Collectors.toMap(ConversationMember::getUserId, m -> m));

        List<Long> userIds = members.stream().map(ConversationMember::getUserId).toList();
        var users = userRepository.findAllById(userIds);

        // Check requester's role
        ConversationMember requesterMember = memberMap.get(requesterId);

        boolean isAdmin = requesterMember != null &&
                (requesterMember.getRole() == ConversationMember.MemberRole.OWNER ||
                 requesterMember.getRole() == ConversationMember.MemberRole.ADMIN);

        // Check conversation privacy settings
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        boolean allowViewProfile = conversation != null &&
                conversation.getAllowMemberViewProfile() != null &&
                conversation.getAllowMemberViewProfile();

        boolean allowAddFriend = conversation != null &&
                conversation.getAllowMemberAddFriend() != null &&
                conversation.getAllowMemberAddFriend();

        return users.stream().map(user -> {
            var memberInfo = memberMap.get(user.getId());

            Map<String, Object> memberData = new HashMap<>();
            memberData.put("id", user.getId());
            memberData.put("username", user.getUsername());
            memberData.put("studentId", user.getStudentId() != null ? user.getStudentId() : "");
            memberData.put("avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "");
            memberData.put("role", memberInfo != null ? memberInfo.getRole().name() : "MEMBER");

            if (isAdmin || allowViewProfile || user.getId().equals(requesterId)) {
                memberData.put("phone", user.getPhone() != null ? user.getPhone() : "");
                memberData.put("email", user.getEmail() != null ? user.getEmail() : "");
                memberData.put("canViewProfile", true);
            } else {
                memberData.put("canViewProfile", false);
            }

            memberData.put("canAddFriend", isAdmin || allowAddFriend || user.getId().equals(requesterId));

            return memberData;
        }).collect(Collectors.toList());
    }

    public Map<String, Object> getGroupSettings(Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("会话不存在"));
        Map<String, Object> settings = new HashMap<>();
        settings.put("allowMemberAddFriend", conversation.getAllowMemberAddFriend() != null && conversation.getAllowMemberAddFriend());
        settings.put("allowMemberViewProfile", conversation.getAllowMemberViewProfile() != null && conversation.getAllowMemberViewProfile());
        return settings;
    }
}
