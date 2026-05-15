package com.webchat.controller;

import com.webchat.entity.UserSession;
import com.webchat.security.JwtTokenProvider;
import com.webchat.service.UserSessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    @Autowired
    private UserSessionService userSessionService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @PostMapping("/login")
    public ResponseEntity<?> createSession(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> body,
            HttpServletRequest request
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            String deviceId = body.getOrDefault("deviceId", "web-" + System.currentTimeMillis());
            String deviceType = body.getOrDefault("deviceType", "WEB");
            String deviceName = body.getOrDefault("deviceName", "Web Browser");

            UserSession session = userSessionService.createSession(
                    userId,
                    deviceId,
                    deviceType,
                    deviceName,
                    request.getRemoteAddr(),
                    request.getHeader("User-Agent")
            );

            return ResponseEntity.ok(Map.of(
                    "sessionToken", session.getSessionToken(),
                    "deviceId", session.getDeviceId()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestBody Map<String, String> body) {
        try {
            String sessionToken = body.get("sessionToken");
            userSessionService.updateHeartbeat(sessionToken);
            return ResponseEntity.ok(Map.of("message", "ok"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> body) {
        try {
            String sessionToken = body.get("sessionToken");
            userSessionService.logout(sessionToken);
            return ResponseEntity.ok(Map.of("message", "已退出"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> getSessions(@RequestHeader("Authorization") String token) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            List<UserSession> sessions = userSessionService.getUserSessions(userId);
            return ResponseEntity.ok(sessions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{deviceId}")
    public ResponseEntity<?> logoutDevice(
            @PathVariable String deviceId,
            @RequestHeader("Authorization") String token
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            userSessionService.logoutDevice(userId, deviceId);
            return ResponseEntity.ok(Map.of("message", "设备已下线"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/online-status/{userId}")
    public ResponseEntity<?> getOnlineStatus(@PathVariable Long userId) {
        try {
            boolean online = userSessionService.isUserOnline(userId);
            return ResponseEntity.ok(Map.of("online", online));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
