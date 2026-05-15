package com.webchat.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_members")
@Data
public class ConversationMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberRole role = MemberRole.MEMBER;

    @CreationTimestamp
    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @Column(name = "last_read_at")
    private LocalDateTime lastReadAt;

    @Column(nullable = false)
    private Boolean pinned = false;

    @Column(name = "pinned_at")
    private LocalDateTime pinnedAt;

    @Column(nullable = false)
    private Boolean muted = false;

    @Column(nullable = false)
    private Boolean hidden = false;

    @Column(name = "muted_until")
    private LocalDateTime mutedUntil;

    @Column(name = "group_nickname", length = 50)
    private String groupNickname;

    public enum MemberRole {
        OWNER,
        ADMIN,
        MEMBER
    }
}
