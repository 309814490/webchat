package com.webchat.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "call_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CallRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "caller_id", nullable = false)
    private Long callerId;

    @Column(name = "callee_id", nullable = false)
    private Long calleeId;

    @Column(name = "conversation_id")
    private Long conversationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "call_type", nullable = false)
    private CallType callType;

    @Enumerated(EnumType.STRING)
    @Column(name = "call_status", nullable = false)
    private CallStatus callStatus;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "duration")
    private Integer duration; // 秒

    @Column(name = "end_reason")
    private String endReason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public enum CallType {
        AUDIO, VIDEO
    }

    public enum CallStatus {
        RINGING,    // 响铃中
        CONNECTED,  // 已接通
        ENDED,      // 已结束
        MISSED,     // 未接
        REJECTED,   // 已拒绝
        CANCELLED   // 已取消
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
