package com.webchat.dto;

import com.webchat.entity.FriendRequest;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FriendRequestDTO {
    private Long id;
    private Long fromUserId;
    private String fromUsername;
    private String fromStudentId;
    private String fromPhone;
    private String fromAvatarUrl;
    private String status;
    private LocalDateTime createdAt;

    public static FriendRequestDTO fromEntity(FriendRequest request, UserDTO fromUser) {
        FriendRequestDTO dto = new FriendRequestDTO();
        dto.setId(request.getId());
        dto.setFromUserId(request.getFromUserId());
        dto.setFromUsername(fromUser.getUsername());
        dto.setFromStudentId(fromUser.getStudentId());
        dto.setFromPhone(fromUser.getPhone());
        dto.setFromAvatarUrl(fromUser.getAvatarUrl());
        dto.setStatus(request.getStatus().name());
        dto.setCreatedAt(request.getCreatedAt());
        return dto;
    }
}
