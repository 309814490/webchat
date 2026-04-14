package com.webchat.service;

import com.webchat.dto.CreateGroupRequest;
import com.webchat.entity.Conversation;
import com.webchat.entity.ConversationMember;
import com.webchat.entity.Group;
import com.webchat.entity.GroupMember;
import com.webchat.repository.ConversationMemberRepository;
import com.webchat.repository.ConversationRepository;
import com.webchat.repository.GroupMemberRepository;
import com.webchat.repository.GroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

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
    public void setMemberAsAdmin(Long groupId, Long targetUserId, Long operatorId) {
        // 验证操作者是否是管理员或群主
        GroupMember operator = groupMemberRepository.findByGroupIdAndUserId(groupId, operatorId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (operator.getRole() != GroupMember.MemberRole.OWNER &&
            operator.getRole() != GroupMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主或管理员可以设置管理员");
        }

        // 获取目标成员
        GroupMember targetMember = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new RuntimeException("目标用户不是群组成员"));

        // 如果已经是管理员或群主，不需要修改
        if (targetMember.getRole() == GroupMember.MemberRole.ADMIN ||
            targetMember.getRole() == GroupMember.MemberRole.OWNER) {
            throw new RuntimeException("该成员已经是管理员");
        }

        // 设置为管理员
        targetMember.setRole(GroupMember.MemberRole.ADMIN);
        groupMemberRepository.save(targetMember);

        System.out.println("✅ 设置管理员: 群组ID=" + groupId + ", 用户ID=" + targetUserId + ", 操作者ID=" + operatorId);
    }

    @Transactional
    public void removeMemberAdmin(Long groupId, Long targetUserId, Long operatorId) {
        // 验证操作者是否是管理员或群主
        GroupMember operator = groupMemberRepository.findByGroupIdAndUserId(groupId, operatorId)
                .orElseThrow(() -> new RuntimeException("您不是群组成员"));

        if (operator.getRole() != GroupMember.MemberRole.OWNER &&
            operator.getRole() != GroupMember.MemberRole.ADMIN) {
            throw new RuntimeException("只有群主或管理员可以取消管理员");
        }

        // 获取目标成员
        GroupMember targetMember = groupMemberRepository.findByGroupIdAndUserId(groupId, targetUserId)
                .orElseThrow(() -> new RuntimeException("目标用户不是群组成员"));

        // 不能取消群主的管理员权限
        if (targetMember.getRole() == GroupMember.MemberRole.OWNER) {
            throw new RuntimeException("不能取消群主的管理员权限");
        }

        // 如果不是管理员，不需要修改
        if (targetMember.getRole() != GroupMember.MemberRole.ADMIN) {
            throw new RuntimeException("该成员不是管理员");
        }

        // 取消管理员权限，设置为普通成员
        targetMember.setRole(GroupMember.MemberRole.MEMBER);
        groupMemberRepository.save(targetMember);

        System.out.println("✅ 取消管理员: 群组ID=" + groupId + ", 用户ID=" + targetUserId + ", 操作者ID=" + operatorId);
    }
}
