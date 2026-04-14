package com.webchat.controller;

import com.webchat.dto.FileUploadResponse;
import com.webchat.service.FileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileService fileService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type,
            Authentication authentication) {
        try {
            Long userId = (Long) authentication.getPrincipal();
            System.out.println("用户 " + userId + " 上传文件: " + file.getOriginalFilename());
            FileUploadResponse response = fileService.uploadFile(file, type);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
