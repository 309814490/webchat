package com.webchat.service;

import com.webchat.dto.FileUploadResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

@Service
public class FileService {

    @Value("${file.upload.dir:uploads}")
    private String uploadDir;

    @Value("${file.base.url:http://localhost:8080/uploads}")
    private String baseUrl;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp",
            ".mp4", ".avi", ".mov", ".mkv", ".webm",
            ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac",
            ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
            ".txt", ".zip", ".rar", ".7z"
    );

    public FileUploadResponse uploadFile(MultipartFile file, String type) throws IOException {
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase()
                : "";

        if (extension.isEmpty() || !ALLOWED_EXTENSIONS.contains(extension)) {
            throw new RuntimeException("不支持的文件类型: " + extension);
        }

        String fileName = UUID.randomUUID().toString() + extension;

        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        String fileUrl = baseUrl + "/" + fileName;
        return new FileUploadResponse(
                fileUrl,
                originalFilename,
                type,
                file.getSize()
        );
    }
}
