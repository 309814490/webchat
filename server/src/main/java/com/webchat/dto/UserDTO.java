package com.webchat.dto;

import com.webchat.entity.User;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String phone;
    private String studentId;
    private String idCard;
    private String avatarUrl;
    private User.UserStatus status;
    private LocalDateTime createdAt;

    public static UserDTO fromEntity(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        dto.setStudentId(user.getStudentId());
        dto.setIdCard(user.getIdCard());
        dto.setAvatarUrl(user.getAvatarUrl());
        dto.setStatus(user.getStatus());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }
}
