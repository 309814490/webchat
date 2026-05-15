package com.webchat.controller;

import com.webchat.dto.GroupFileDTO;
import com.webchat.security.JwtTokenProvider;
import com.webchat.service.FileService;
import com.webchat.service.GroupFileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups/{groupId}/files")
public class GroupFileController {

    @Autowired
    private GroupFileService groupFileService;

    @Autowired
    private FileService fileService;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @PathVariable Long groupId,
            @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String token
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));

            // 上传文件
            var uploadResponse = fileService.uploadFile(file, "FILE");

            // 保存到群文件库
            GroupFileDTO fileDTO = groupFileService.uploadFile(
                    groupId,
                    userId,
                    uploadResponse.getFileName(),
                    uploadResponse.getUrl(),
                    uploadResponse.getFileSize(),
                    uploadResponse.getFileType()
            );

            return ResponseEntity.ok(fileDTO);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getGroupFiles(@PathVariable Long groupId) {
        try {
            List<GroupFileDTO> files = groupFileService.getGroupFiles(groupId);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<?> deleteFile(
            @PathVariable Long groupId,
            @PathVariable Long fileId,
            @RequestHeader("Authorization") String token
    ) {
        try {
            Long userId = jwtTokenProvider.getUserIdFromToken(token.replace("Bearer ", ""));
            groupFileService.deleteFile(fileId, userId);
            return ResponseEntity.ok(Map.of("message", "文件已删除"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
