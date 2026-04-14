package com.webchat.dto;

import lombok.Data;

@Data
public class SearchUserRequest {
    private String type; // "studentId" or "phone"
    private String value;
}
