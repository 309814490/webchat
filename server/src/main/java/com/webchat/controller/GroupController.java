package com.webchat.controller;

import com.webchat.dto.CreateGroupRequest;
import com.webchat.entity.Group;
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

            // 验证用户是否是群组成员
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

    @PostMapping("/{groupId}/members/{memberId}/set-admin")
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

    @PostMapping("/{groupId}/members/{memberId}/remove-admin")
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
}
