package com.webchat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 获取绝对路径
        File uploadPath = new File(uploadDir);
        String absolutePath = uploadPath.getAbsolutePath();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:///" + absolutePath.replace("\\", "/") + "/");
    }
}
