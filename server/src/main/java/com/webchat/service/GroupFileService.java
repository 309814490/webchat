package com.webchat.service;

import com.webchat.dto.GroupFileDTO;
import com.webchat.entity.GroupFile;
import com.webchat.entity.User;
import com.webchat.repository.GroupFileRepository;
import com.webchat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class GroupFileService {

    @Autowired
    private GroupFileRepository groupFileRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public GroupFileDTO uploadFile(Long groupId, Long uploaderId, String fileName, String fileUrl, Long fileSize, String fileType) {
        GroupFile file = new GroupFile();
        file.setGroupId(groupId);
        file.setUploaderId(uploaderId);
        file.setFileName(fileName);
        file.setFileUrl(fileUrl);
        file.setFileSize(fileSize);
        file.setFileType(fileType);
        file.setDeleted(false);

        GroupFile saved = groupFileRepository.save(file);

        User uploader = userRepository.findById(uploaderId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));

        return GroupFileDTO.fromEntity(saved, uploader.getUsername(), uploader.getStudentId());
    }

    public List<GroupFileDTO> getGroupFiles(Long groupId) {
        List<GroupFile> files = groupFileRepository.findByGroupIdAndDeletedFalseOrderByCreatedAtDesc(groupId);

        List<Long> uploaderIds = files.stream().map(GroupFile::getUploaderId).distinct().collect(Collectors.toList());
        Map<Long, User> userMap = userRepository.findAllById(uploaderIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return files.stream().map(file -> {
            User uploader = userMap.get(file.getUploaderId());
            return GroupFileDTO.fromEntity(
                    file,
                    uploader != null ? uploader.getUsername() : "未知",
                    uploader != null ? uploader.getStudentId() : ""
            );
        }).collect(Collectors.toList());
    }

    @Transactional
    public void deleteFile(Long fileId, Long userId) {
        GroupFile file = groupFileRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("文件不存在"));

        if (!file.getUploaderId().equals(userId)) {
            throw new RuntimeException("只能删除自己上传的文件");
        }

        file.setDeleted(true);
        groupFileRepository.save(file);
    }
}
