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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class GroupService {

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

        System.out.println("✅ 创建群组会话: 群组ID=" + group.getId() + ", 会话ID=" + conversation.getId() + ", 类型=" + conversation.getType());

        // Add creator as owner (owner is also admin)
        GroupMember ownerMember = new GroupMember();
        ownerMember.setGroupId(group.getId());
        ownerMember.setUserId(creatorId);
        ownerMember.setRole(GroupMember.MemberRole.OWNER);
        groupMemberRepository.save(ownerMember);

        // Add creator to conversation as owner
        ConversationMember ownerConvMember = new ConversationMember();
        ownerConvMember.setConversationId(conversation.getId());
        ownerConvMember.setUserId(creatorId);
        ownerConvMember.setRole(ConversationMember.MemberRole.OWNER);
        conversationMemberRepository.save(ownerConvMember);

        // Add other members
        for (Long memberId : request.getMemberIds()) {
            if (!memberId.equals(creatorId)) {
                GroupMember member = new GroupMember();
                member.setGroupId(group.getId());
                member.setUserId(memberId);
                member.setRole(GroupMember.MemberRole.MEMBER);
                groupMemberRepository.save(member);

                // Add member to conversation
                ConversationMember convMember = new ConversationMember();
                convMember.setConversationId(conversation.getId());
                convMember.setUserId(memberId);
                convMember.setRole(ConversationMember.MemberRole.MEMBER);
                conversationMemberRepository.save(convMember);
            }
        }

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
        // 验证操作者是否是会话成员且有权限（群主或管理员）
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (member.getRole() != ConversationMember.MemberRole.OWNER &&
            member.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主或管理员可以修改群名称");
        }

        // 更新会话名称
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("会话不存在"));
        conversation.setName(newName);
        conversationRepository.save(conversation);

        System.out.println("✅ 修改群名称: 会话ID=" + conversationId + ", 新名称=" + newName + ", 操作者ID=" + userId);
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
        // 验证操作者是否是管理员或群主
        ConversationMember operator = conversationMemberRepository.findByConversationIdAndUserId(conversationId, operatorId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (operator.getRole() != ConversationMember.MemberRole.OWNER &&
            operator.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主或管理员可以设置管理员");
        }

        // 获取目标成员
        ConversationMember targetMember = conversationMemberRepository.findByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new RuntimeException("目标用户不是群组成员"));

        // 如果已经是管理员或群主，不需要修改
        if (targetMember.getRole() == ConversationMember.MemberRole.ADMIN ||
            targetMember.getRole() == ConversationMember.MemberRole.OWNER) {
            throw new RuntimeException("该成员已经是管理员");
        }

        // 设置为管理员
        targetMember.setRole(ConversationMember.MemberRole.ADMIN);
        conversationMemberRepository.save(targetMember);

        System.out.println("✅ 设置管理员: 会话ID=" + conversationId + ", 用户ID=" + targetUserId + ", 操作者ID=" + operatorId);
    }

    @Transactional
    public void removeMemberAdmin(Long conversationId, Long targetUserId, Long operatorId) {
        // 验证操作者是否是管理员或群主
        ConversationMember operator = conversationMemberRepository.findByConversationIdAndUserId(conversationId, operatorId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (operator.getRole() != ConversationMember.MemberRole.OWNER &&
            operator.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主或管理员可以取消管理员");
        }

        // 获取目标成员
        ConversationMember targetMember = conversationMemberRepository.findByConversationIdAndUserId(conversationId, targetUserId)
                .orElseThrow(() -> new RuntimeException("目标用户不是群组成员"));

        // 不能取消群主的管理员权限
        if (targetMember.getRole() == ConversationMember.MemberRole.OWNER) {
            throw new RuntimeException("不能取消群主的管理员权限");
        }

        // 如果不是管理员，不需要修改
        if (targetMember.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("该成员不是管理员");
        }

        // 取消管理员权限，设置为普通成员
        targetMember.setRole(ConversationMember.MemberRole.MEMBER);
        conversationMemberRepository.save(targetMember);

        System.out.println("✅ 取消管理员: 会话ID=" + conversationId + ", 用户ID=" + targetUserId + ", 操作者ID=" + operatorId);
    }

    @Transactional
    public void transferOwner(Long conversationId, Long newOwnerId, Long currentOwnerId) {
        // 验证操作者是否是群主
        ConversationMember currentOwner = conversationMemberRepository.findByConversationIdAndUserId(conversationId, currentOwnerId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (currentOwner.getRole() != ConversationMember.MemberRole.OWNER) {
            throw new RuntimeException("只有群主可以转让群组");
        }

        // 获取新群主
        ConversationMember newOwner = conversationMemberRepository.findByConversationIdAndUserId(conversationId, newOwnerId)
                .orElseThrow(() -> new RuntimeException("目标用户不是群组成员"));

        // 不能转让给自己
        if (currentOwnerId.equals(newOwnerId)) {
            throw new RuntimeException("不能转让给自己");
        }

        // 将当前群主降为管理员
        currentOwner.setRole(ConversationMember.MemberRole.ADMIN);
        conversationMemberRepository.save(currentOwner);

        // 将新成员设为群主
        newOwner.setRole(ConversationMember.MemberRole.OWNER);
        conversationMemberRepository.save(newOwner);

        System.out.println("✅ 转让群主: 会话ID=" + conversationId + ", 原群主ID=" + currentOwnerId + ", 新群主ID=" + newOwnerId);
    }

    // ===== 公告相关方法 =====

    @Transactional
    public GroupAnnouncement createAnnouncement(Long conversationId, Long userId, String content) {
        // 验证用户是否是会话成员
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        // 只有群主和管理员可以发布公告
        if (member.getRole() != ConversationMember.MemberRole.OWNER &&
            member.getRole() != ConversationMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主和管理员可以发布公告");
        }

        if (content == null || content.trim().isEmpty()) {
            throw new RuntimeException("公告内容不能为空");
        }

        GroupAnnouncement announcement = new GroupAnnouncement();
        announcement.setGroupId(conversationId); // 使用 conversationId 作为 groupId
        announcement.setCreatorId(userId);
        announcement.setContent(content.trim());
        announcement = groupAnnouncementRepository.save(announcement);

        System.out.println("✅ 创建公告: 会话ID=" + conversationId + ", 创建者ID=" + userId);
        return announcement;
    }

    public List<Map<String, Object>> getAnnouncements(Long conversationId, Long userId) {
        // 验证用户是否是会话成员
        System.out.println("🔍 验证公告权限: conversationId=" + conversationId + ", userId=" + userId);
        boolean isMember = conversationMemberRepository.existsByConversationIdAndUserId(conversationId, userId);
        System.out.println("🔍 是否是会话成员: " + isMember);

        if (!isMember) {
            throw new RuntimeException("您不是群组成员");
        }

        List<GroupAnnouncement> announcements = groupAnnouncementRepository
                .findByGroupIdAndDeletedFalseOrderByCreatedAtDesc(conversationId);

        List<Map<String, Object>> result = new ArrayList<>();
        for (GroupAnnouncement announcement : announcements) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", announcement.getId());
            map.put("groupId", announcement.getGroupId());
            map.put("content", announcement.getContent());
            map.put("createdAt", announcement.getCreatedAt());
            map.put("creatorId", announcement.getCreatorId());

            // 获取创建者信息
            userRepository.findById(announcement.getCreatorId()).ifPresent(user -> {
                map.put("creatorName", user.getUsername());
                map.put("creatorStudentId", user.getStudentId());
            });

            result.add(map);
        }

        return result;
    }

    public Map<String, Object> getLatestAnnouncement(Long conversationId, Long userId) {
        // 验证用户是否是会话成员
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

                    // 获取创建者信息
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
        // 验证用户是否是会话成员
        ConversationMember member = conversationMemberRepository.findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        // 获取公告
        GroupAnnouncement announcement = groupAnnouncementRepository.findById(announcementId)
                .orElseThrow(() -> new RuntimeException("公告不存在"));

        if (!announcement.getGroupId().equals(conversationId)) {
            throw new RuntimeException("公告不属于该群组");
        }

        // 只有群主、管理员或公告创建者可以删除
        if (member.getRole() != ConversationMember.MemberRole.OWNER &&
            member.getRole() != ConversationMember.MemberRole.ADMIN &&
            !announcement.getCreatorId().equals(userId)) {
            throw new RuntimeException("只有群主、管理员或公告创建者可以删除公告");
        }

        announcement.setDeleted(true);
        announcement.setDeletedAt(LocalDateTime.now());
        groupAnnouncementRepository.save(announcement);

        System.out.println("✅ 删除公告: 会话ID=" + conversationId + ", 公告ID=" + announcementId + ", 操作者ID=" + userId);
    }
}
