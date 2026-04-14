package com.webchat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateGroupRequest {
    @NotBlank(message = "群组名称不能为空")
    @Size(max = 100, message = "群组名称不能超过100个字符")
    private String name;

    @NotNull(message = "成员列表不能为空")
    @Size(min = 1, message = "至少需要一个成员")
    private List<Long> memberIds;

    private String avatarUrl;
}
