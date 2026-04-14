package com.webchat.controller;

import com.webchat.dto.SearchUserRequest;
import com.webchat.dto.UserDTO;
import com.webchat.security.JwtTokenProvider;
import com.webchat.service.FriendService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    @Autowired
    private FriendService friendService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @PostMapping("/search")
    public ResponseEntity<?> searchUser(@RequestBody SearchUserRequest request) {
        try {
            UserDTO user = friendService.searchUser(request);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/request")
    public ResponseEntity<?> sendFriendRequest(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Long> body
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            Long toUserId = body.get("toUserId");
            friendService.sendFriendRequest(userId, toUserId);
            return ResponseEntity.ok(Map.of("message", "好友请求已发送"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/request/{requestId}/accept")
    public ResponseEntity<?> acceptFriendRequest(
            @RequestHeader("Authorization") String token,
            @PathVariable Long requestId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            friendService.acceptFriendRequest(requestId, userId);
            return ResponseEntity.ok(Map.of("message", "已接受好友请求"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/request/{requestId}/reject")
    public ResponseEntity<?> rejectFriendRequest(
            @RequestHeader("Authorization") String token,
            @PathVariable Long requestId
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            friendService.rejectFriendRequest(requestId, userId);
            return ResponseEntity.ok(Map.of("message", "已拒绝好友请求"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> getFriendList(@RequestHeader("Authorization") String token) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            List<UserDTO> friends = friendService.getFriendList(userId);
            return ResponseEntity.ok(friends);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/requests/pending")
    public ResponseEntity<?> getPendingRequests(@RequestHeader("Authorization") String token) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            return ResponseEntity.ok(friendService.getPendingRequests(userId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
