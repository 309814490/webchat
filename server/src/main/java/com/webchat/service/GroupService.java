package com.webchat.service;

import com.webchat.dto.CreateGroupRequest;
import com.webchat.entity.Conversation;
import com.webchat.entity.ConversationMember;
import com.webchat.entity.Group;
import com.webchat.entity.GroupAnnouncement;
import com.webchat.entity.GroupMember;
import com.webchat.repository.ConversationMemberRepository;
import com.webchat.repository.ConversationRepository;
import com.webchat.repository.GroupAnnouncementRepository;
import com.webchat.repository.GroupMemberRepository;
import com.webchat.repository.GroupRepository;
import com.webchat.repository.UserRepository;
import com.webchat.entity.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GroupService {

    private static final Logger log = LoggerFactory.getLogger(GroupService.class);

    @Autowired
    private GroupRepository groupRepository;

    @Autowired
    private GroupMemberRepository groupMemberRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private ConversationMemberRepository conversationMemberRepository;

    @Autowired
    private GroupAnnouncementRepository groupAnnouncementRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public Group createGroup(CreateGroupRequest request, Long creatorId) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new RuntimeException("群组名称不能为空");
        }

        if (request.getMemberIds() == null || request.getMemberIds().isEmpty()) {
            throw new RuntimeException("至少需要选择一个成员");
        }

        // Create group
        Group group = new Group();
        group.setName(request.getName().trim());
        group.setCreatorId(creatorId);
        group = groupRepository.save(group);

        // Create GROUP conversation for this group
        Conversation conversation = new Conversation();
        conversation.setType(Conversation.ConversationType.GROUP);
        conversation.setName(group.getName());
        conversation.setCreatedBy(creatorId);
        conversation = conversationRepository.save(conversation);

        log.info("创建群组会话: 群组ID={}, 会话ID={}, 类型={}", group.getId(), conversation.getId(), conversation.getType());

        // Add creator as owner
        GroupMember ownerMember = new GroupMember();
        ownerMember.setGroupId(group.getId());
        ownerMember.setUserId(creatorId);
        ownerMember.setRole(GroupMember.MemberRole.OWNER);

        ConversationMember ownerConvMember = new ConversationMember();
        ownerConvMember.setConversationId(conversation.getId());
        ownerConvMember.setUserId(creatorId);
        ownerConvMember.setRole(ConversationMember.MemberRole.OWNER);

        // 批量收集所有成员，最后一次性 saveAll
        List<GroupMember> groupMembers = new ArrayList<>();
        groupMembers.add(ownerMember);
        List<ConversationMember> convMembers = new ArrayList<>();
        convMembers.add(ownerConvMember);

        for (Long memberId : request.getMemberIds()) {
            if (!memberId.equals(creatorId)) {
                GroupMember member = new GroupMember();
                member.setGroupId(group.getId());
                member.setUserId(memberId);
                member.setRole(GroupMember.MemberRole.MEMBER);
                groupMembers.add(member);

                ConversationMember convMember = new ConversationMember();
                convMember.setConversationId(conversation.getId());
                convMember.setUserId(memberId);
                convMember.setRole(ConversationMember.MemberRole.MEMBER);
                convMembers.add(convMember);
            }
        }

        groupMemberRepository.saveAll(groupMembers);
        conversationMemberRepository.saveAll(convMembers);

        return group;
    }

    public List<Group> getUserGroups(Long userId) {
        List<GroupMember> memberships = groupMemberRepository.findByUserId(userId);
        List<Long> groupIds = memberships.stream()
                .map(GroupMember::getGroupId)
                .toList();

        return groupRepository.findAllById(groupIds).stream()
                .filter(group -> !group.getDeleted())
                .toList();
    }

    public boolean isGroupMember(Long userId, Long groupId) {
        return groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
    }

    public List<GroupMember> getGroupMembers(Long groupId) {
        return groupMemberRepository.findByGroupId(groupId);
    }

    @Transactional
    public void updateGroupName(Long conversationId, String newName, Long userId) {
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (member.getRole() != ConversationMember.MemberRole.OWNER &&
            member.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主或管理员可以修改群名称");
        }

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("会话不存在"));
        conversation.setName(newName);
        conversationRepository.save(conversation);

        log.info("修改群名称: 会话ID={}, 新名称={}, 操作者ID={}", conversationId, newName, userId);
    }

    @Transactional
    public void deleteGroup(Long groupId, Long userId) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("群组不存在"));

        if (!group.getCreatorId().equals(userId)) {
            throw new RuntimeException("只有群主可以解散群组");
        }

        group.setDeleted(true);
        group.setDeletedAt(LocalDateTime.now());
        groupRepository.save(group);
    }

    @Transactional
    public void setMemberAsAdmin(Long conversationId, Long targetUserId, Long operatorId) {
        ConversationMember operator = conversationMemberRepository.findByConversationIdAndUserId(conversationId, operatorId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (operator.getRole() != ConversationMember.MemberRole.OWNER &&
            operator.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主或管理员可以设置管理员");
        }

        ConversationMember targetMember = conversationMemberRepository.findByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new RuntimeException("目标用户不是群组成员"));

        if (targetMember.getRole() == ConversationMember.MemberRole.ADMIN ||
            targetMember.getRole() == ConversationMember.MemberRole.OWNER) {
            throw new RuntimeException("该成员已经是管理员");
        }

        targetMember.setRole(ConversationMember.MemberRole.ADMIN);
        conversationMemberRepository.save(targetMember);

        log.info("设置管理员: 会话ID={}, 用户ID={}, 操作者ID={}", conversationId, targetUserId, operatorId);
    }

    @Transactional
    public void removeMemberAdmin(Long conversationId, Long targetUserId, Long operatorId) {
        ConversationMember operator = conversationMemberRepository.findByConversationIdAndUserId(conversationId, operatorId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (operator.getRole() != ConversationMember.MemberRole.OWNER &&
            operator.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主或管理员可以取消管理员");
        }

        ConversationMember targetMember = conversationMemberRepository.findByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new RuntimeException("目标用户不是群组成员"));

        if (targetMember.getRole() == ConversationMember.MemberRole.OWNER) {
            throw new RuntimeException("不能取消群主的管理员权限");
        }

        if (targetMember.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("该成员不是管理员");
        }

        targetMember.setRole(ConversationMember.MemberRole.MEMBER);
        conversationMemberRepository.save(targetMember);

        log.info("取消管理员: 会话ID={}, 用户ID={}, 操作者ID={}", conversationId, targetUserId, operatorId);
    }

    @Transactional
    public void transferOwner(Long conversationId, Long newOwnerId, Long currentOwnerId) {
        ConversationMember currentOwner = conversationMemberRepository.findByConversationIdAndUserId(conversationId, currentOwnerId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (currentOwner.getRole() != ConversationMember.MemberRole.OWNER) {
            throw new RuntimeException("只有群主可以转让群组");
        }

        ConversationMember newOwner = conversationMemberRepository.findByConversationIdAndUserId(conversationId, newOwnerId)
                .orElseThrow(() -> new RuntimeException("目标用户不是群组成员"));

        if (currentOwnerId.equals(newOwnerId)) {
            throw new RuntimeException("不能转让给自己");
        }

        currentOwner.setRole(ConversationMember.MemberRole.ADMIN);
        newOwner.setRole(ConversationMember.MemberRole.OWNER);
        conversationMemberRepository.saveAll(List.of(currentOwner, newOwner));

        log.info("转让群主: 会话ID={}, 原群主ID={}, 新群主ID={}", conversationId, currentOwnerId, newOwnerId);
    }

    // ===== 公告相关方法 =====

    @Transactional
    public GroupAnnouncement createAnnouncement(Long conversationId, Long userId, String content) {
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (member.getRole() != ConversationMember.MemberRole.OWNER &&
            member.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主和管理员可以发布公告");
        }

        if (content == null || content.trim().isEmpty()) {
            throw new RuntimeException("公告内容不能为空");
        }

        GroupAnnouncement announcement = new GroupAnnouncement();
        announcement.setGroupId(conversationId);
        announcement.setCreatorId(userId);
        announcement.setContent(content.trim());
        announcement = groupAnnouncementRepository.save(announcement);

        log.info("创建公告: 会话ID={}, 创建者ID={}", conversationId, userId);
        return announcement;
    }

    public List<Map<String, Object>> getAnnouncements(Long conversationId, Long userId) {
        if (!conversationMemberRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("您不是群组成员");
        }

        List<GroupAnnouncement> announcements = groupAnnouncementRepository
                .findByGroupIdAndDeletedFalseOrderByCreatedAtDesc(conversationId);

        // 批量获取所有公告创建者信息（消除 N+1）
        List<Long> creatorIds = announcements.stream()
                .map(GroupAnnouncement::getCreatorId)
                .distinct()
                .toList();
        Map<Long, User> creatorMap = userRepository.findAllById(creatorIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<Map<String, Object>> result = new ArrayList<>();
        for (GroupAnnouncement announcement : announcements) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", announcement.getId());
            map.put("groupId", announcement.getGroupId());
            map.put("content", announcement.getContent());
            map.put("createdAt", announcement.getCreatedAt());
            map.put("creatorId", announcement.getCreatorId());

            User creator = creatorMap.get(announcement.getCreatorId());
            if (creator != null) {
                map.put("creatorName", creator.getUsername());
                map.put("creatorStudentId", creator.getStudentId());
            }

            result.add(map);
        }

        return result;
    }

    public Map<String, Object> getLatestAnnouncement(Long conversationId, Long userId) {
        if (!conversationMemberRepository.existsByConversationIdAndUserId(conversationId, userId)) {
            throw new RuntimeException("您不是群组成员");
        }

        return groupAnnouncementRepository
                .findFirstByGroupIdAndDeletedFalseOrderByCreatedAtDesc(conversationId)
                .map(announcement -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", announcement.getId());
                    map.put("groupId", announcement.getGroupId());
                    map.put("content", announcement.getContent());
                    map.put("createdAt", announcement.getCreatedAt());
                    map.put("creatorId", announcement.getCreatorId());

                    userRepository.findById(announcement.getCreatorId()).ifPresent(user -> {
                        map.put("creatorName", user.getUsername());
                        map.put("creatorStudentId", user.getStudentId());
                    });

                    return map;
                })
                .orElse(null);
    }

    @Transactional
    public void deleteAnnouncement(Long conversationId, Long announcementId, Long userId) {
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        GroupAnnouncement announcement = groupAnnouncementRepository.findById(announcementId)
                .orElseThrow(() -> new RuntimeException("公告不存在"));

        if (!announcement.getGroupId().equals(conversationId)) {
            throw new RuntimeException("公告不属于该群组");
        }

        if (member.getRole() != ConversationMember.MemberRole.OWNER &&
            member.getRole() != ConversationMember.MemberRole.ADMIN &&
            !announcement.getCreatorId().equals(userId)) {
            throw new RuntimeException("只有群主、管理员或公告创建者可以删除公告");
        }

        announcement.setDeleted(true);
        announcement.setDeletedAt(LocalDateTime.now());
        groupAnnouncementRepository.save(announcement);

        log.info("删除公告: 会话ID={}, 公告ID={}, 操作者ID={}", conversationId, announcementId, userId);
    }

    @Transactional
    public void leaveGroup(Long conversationId, Long userId) {
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (member.getRole() == ConversationMember.MemberRole.OWNER) {
            throw new RuntimeException("群主不能直接退出群组，请先转让群主");
        }

        conversationMemberRepository.delete(member);

        // 先查出会话名称（循环外查一次）
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        if (conversation == null || conversation.getName() == null) return;

        // 批量查出用户所有群成员关系和对应的群
        List<GroupMember> groupMemberships = groupMemberRepository.findByUserId(userId);
        List<Long> groupIds = groupMemberships.stream().map(GroupMember::getGroupId).toList();
        Map<Long, Group> groupMap = groupRepository.findAllById(groupIds).stream()
                .collect(Collectors.toMap(Group::getId, g -> g));

        for (GroupMember gm : groupMemberships) {
            Group group = groupMap.get(gm.getGroupId());
            if (group != null && conversation.getName().equals(group.getName())) {
                groupMemberRepository.delete(gm);
                break;
            }
        }
    }

    @Transactional
    public void dissolveGroup(Long conversationId, Long userId) {
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (member.getRole() != ConversationMember.MemberRole.OWNER &&
            member.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主或管理员可以解散群组");
        }

        List<ConversationMember> allMembers = conversationMemberRepository.findByConversationId(conversationId);
        conversationMemberRepository.deleteAll(allMembers);

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("会话不存在"));

        // 批量查出用户所有群成员关系和对应的群
        List<GroupMember> groupMemberships = groupMemberRepository.findByUserId(userId);
        List<Long> groupIds = groupMemberships.stream().map(GroupMember::getGroupId).toList();
        Map<Long, Group> groupMap = groupRepository.findAllById(groupIds).stream()
                .collect(Collectors.toMap(Group::getId, g -> g));

        for (GroupMember gm : groupMemberships) {
            Group group = groupMap.get(gm.getGroupId());
            if (group != null && !group.getDeleted() && conversation.getName() != null && conversation.getName().equals(group.getName())) {
                group.setDeleted(true);
                group.setDeletedAt(LocalDateTime.now());
                groupRepository.save(group);

                List<GroupMember> allGroupMembers = groupMemberRepository.findByGroupId(group.getId());
                groupMemberRepository.deleteAll(allGroupMembers);
                break;
            }
        }
    }

    @Transactional
    public void updateGroupSettings(Long conversationId, Long userId, Boolean allowAddFriend, Boolean allowViewProfile) {
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (member.getRole() != ConversationMember.MemberRole.OWNER &&
            member.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主或管理员可以修改群设置");
        }

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("会话不存在"));

        if (allowAddFriend != null) {
            conversation.setAllowMemberAddFriend(allowAddFriend);
        }
        if (allowViewProfile != null) {
            conversation.setAllowMemberViewProfile(allowViewProfile);
        }
        conversationRepository.save(conversation);
    }
}
