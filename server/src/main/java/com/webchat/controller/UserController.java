package com.webchat.controller;

import com.webchat.dto.UserDTO;
import com.webchat.entity.User;
import com.webchat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("用户不存在"));
            return ResponseEntity.ok(UserDTO.fromEntity(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestBody Map<String, String> updates,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("用户不存在"));

            if (updates.containsKey("username")) {
                String newUsername = updates.get("username");
                if (newUsername != null && !newUsername.trim().isEmpty()) {
                    user.setUsername(newUsername.trim());
                }
            }
            if (updates.containsKey("phone")) {
                String newPhone = updates.get("phone");
                if (newPhone != null && !newPhone.trim().isEmpty()) {
                    user.setPhone(newPhone.trim());
                }
            }
            if (updates.containsKey("avatarUrl")) {
                String avatarUrl = updates.get("avatarUrl");
                user.setAvatarUrl(avatarUrl != null && !avatarUrl.trim().isEmpty() ? avatarUrl.trim() : null);
            }

            userRepository.save(user);
            return ResponseEntity.ok(UserDTO.fromEntity(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/password")
    public ResponseEntity<?> updatePassword(
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("用户不存在"));

            String oldPassword = request.get("oldPassword");
            String newPassword = request.get("newPassword");

            if (oldPassword == null || newPassword == null) {
                throw new RuntimeException("请提供旧密码和新密码");
            }

            if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
                throw new RuntimeException("旧密码错误");
            }

            user.setPasswordHash(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "密码修改成功"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
