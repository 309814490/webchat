package com.webchat.controller;

import com.webchat.dto.CreateGroupRequest;
import com.webchat.entity.Group;
import com.webchat.entity.GroupAnnouncement;
import com.webchat.entity.GroupMember;
import com.webchat.security.JwtTokenProvider;
import com.webchat.service.GroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    @Autowired
    private GroupService groupService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @PostMapping("/create")
    public ResponseEntity<?> createGroup(
            @RequestHeader("Authorization") String token,
            @RequestBody CreateGroupRequest request
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            Group group = groupService.createGroup(request, userId);
            return ResponseEntity.ok(group);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> getUserGroups(@RequestHeader("Authorization") String token) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            List<Group> groups = groupService.getUserGroups(userId);
            return ResponseEntity.ok(groups);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<?> getGroupMembers(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            if (!groupService.isGroupMember(userId, groupId)) {
                return ResponseEntity.status(403).body(Map.of("message", "无权访问该群组"));
            }
            List<GroupMember> members = groupService.getGroupMembers(groupId);
            return ResponseEntity.ok(members);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<?> deleteGroup(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            groupService.deleteGroup(groupId, userId);
            return ResponseEntity.ok(Map.of("message", "群组已解散"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{groupId}/name")
    public ResponseEntity<?> updateGroupName(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @RequestBody Map<String, String> request
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            String name = request.get("name");
            if (name == null || name.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "群名称不能为空"));
            }
            groupService.updateGroupName(groupId, name.trim(), userId);
            return ResponseEntity.ok(Map.of("message", "群名称修改成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{groupId}/admins/{memberId}")
    public ResponseEntity<?> setMemberAsAdmin(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @PathVariable Long memberId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            groupService.setMemberAsAdmin(groupId, memberId, userId);
            return ResponseEntity.ok(Map.of("message", "已设置为管理员"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{groupId}/admins/{memberId}")
    public ResponseEntity<?> removeMemberAdmin(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @PathVariable Long memberId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            groupService.removeMemberAdmin(groupId, memberId, userId);
            return ResponseEntity.ok(Map.of("message", "已取消管理员权限"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{groupId}/transfer")
    public ResponseEntity<?> transferOwner(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @RequestBody Map<String, Long> request
    ) {
        try {
            Long currentOwnerId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            Long newOwnerId = request.get("newOwnerId");
            if (newOwnerId == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "新群主ID不能为空"));
            }
            groupService.transferOwner(groupId, newOwnerId, currentOwnerId);
            return ResponseEntity.ok(Map.of("message", "转让群主成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{groupId}/leave")
    public ResponseEntity<?> leaveGroup(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            groupService.leaveGroup(groupId, userId);
            return ResponseEntity.ok(Map.of("message", "已退出群组"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{groupId}/dissolve")
    public ResponseEntity<?> dissolveGroup(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            groupService.dissolveGroup(groupId, userId);
            return ResponseEntity.ok(Map.of("message", "群组已解散"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{groupId}/settings")
    public ResponseEntity<?> updateGroupSettings(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @RequestBody Map<String, Boolean> request
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            Boolean allowAddFriend = request.get("allowMemberAddFriend");
            Boolean allowViewProfile = request.get("allowMemberViewProfile");
            groupService.updateGroupSettings(groupId, userId, allowAddFriend, allowViewProfile);
            return ResponseEntity.ok(Map.of("message", "群设置已更新"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ===== 公告相关接口 =====

    @PostMapping("/{groupId}/announcements")
    public ResponseEntity<?> createAnnouncement(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @RequestBody Map<String, String> request
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            String content = request.get("content");
            GroupAnnouncement announcement = groupService.createAnnouncement(groupId, userId, content);
            return ResponseEntity.ok(announcement);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{groupId}/announcements")
    public ResponseEntity<?> getAnnouncements(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            List<Map<String, Object>> announcements = groupService.getAnnouncements(groupId, userId);
            return ResponseEntity.ok(announcements);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{groupId}/announcements/latest")
    public ResponseEntity<?> getLatestAnnouncement(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            Map<String, Object> announcement = groupService.getLatestAnnouncement(groupId, userId);
            return ResponseEntity.ok(announcement);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{groupId}/announcements/{announcementId}")
    public ResponseEntity<?> deleteAnnouncement(
            @RequestHeader("Authorization") String token,
            @PathVariable Long groupId,
            @PathVariable Long announcementId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            groupService.deleteAnnouncement(groupId, announcementId, userId);
            return ResponseEntity.ok(Map.of("message", "公告已删除"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
