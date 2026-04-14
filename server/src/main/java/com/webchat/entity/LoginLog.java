package com.webchat.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "login_logs", indexes = {
    @Index(name = "idx_login_logs_user_id", columnList = "user_id"),
    @Index(name = "idx_login_logs_login_time", columnList = "login_time")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "login_time", nullable = false)
    @CreationTimestamp
    private LocalDateTime loginTime;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "login_status", length = 20, nullable = false)
    @Enumerated(EnumType.STRING)
    private LoginStatus loginStatus = LoginStatus.SUCCESS;

    @Column(name = "failure_reason", length = 200)
    private String failureReason;

    @Column(name = "device_type", length = 50)
    private String deviceType;

    @Column(name = "browser", length = 50)
    private String browser;

    @Column(name = "os", length = 50)
    private String os;

    public enum LoginStatus {
        SUCCESS, FAILURE
    }
}
