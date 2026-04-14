package com.webchat.service;

import com.webchat.dto.FileUploadResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileService {

    @Value("${file.upload.dir:uploads}")
    private String uploadDir;

    @Value("${file.base.url:http://localhost:8080/uploads}")
    private String baseUrl;

    public FileUploadResponse uploadFile(MultipartFile file, String type) throws IOException {
        // 创建上传目录
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // 生成唯一文件名
        String originalFilename = file.getOriginalFilename();
        String extension = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf("."))
                : "";
        String fileName = UUID.randomUUID().toString() + extension;

        // 保存文件
        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        // 返回文件信息
        String fileUrl = baseUrl + "/" + fileName;
        return new FileUploadResponse(
                fileUrl,
                originalFilename,
                type,
                file.getSize()
        );
    }
}
