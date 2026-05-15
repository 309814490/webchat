package com.webchat.controller;

import com.webchat.entity.UserSettings;
import com.webchat.security.JwtTokenProvider;
import com.webchat.service.UserSettingsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user/settings")
public class UserSettingsController {

    @Autowired
    private UserSettingsService userSettingsService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @GetMapping
    public ResponseEntity<?> getUserSettings(@RequestHeader("Authorization") String token) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            UserSettings settings = userSettingsService.getUserSettings(userId);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping
    public ResponseEntity<?> updateUserSettings(
            @RequestHeader("Authorization") String token,
            @RequestBody UserSettings updates
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            UserSettings settings = userSettingsService.updateUserSettings(userId, updates);
            return ResponseEntity.ok(settings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
