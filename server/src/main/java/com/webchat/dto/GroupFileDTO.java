package com.webchat.dto;

import com.webchat.entity.GroupFile;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GroupFileDTO {
    private Long id;
    private Long groupId;
    private Long uploaderId;
    private String uploaderName;
    private String uploaderStudentId;
    private String fileName;
    private String fileUrl;
    private Long fileSize;
    private String fileType;
    private LocalDateTime createdAt;

    public static GroupFileDTO fromEntity(GroupFile file, String uploaderName, String uploaderStudentId) {
        GroupFileDTO dto = new GroupFileDTO();
        dto.setId(file.getId());
        dto.setGroupId(file.getGroupId());
        dto.setUploaderId(file.getUploaderId());
        dto.setUploaderName(uploaderName);
        dto.setUploaderStudentId(uploaderStudentId);
        dto.setFileName(file.getFileName());
        dto.setFileUrl(file.getFileUrl());
        dto.setFileSize(file.getFileSize());
        dto.setFileType(file.getFileType());
        dto.setCreatedAt(file.getCreatedAt());
        return dto;
    }
}
