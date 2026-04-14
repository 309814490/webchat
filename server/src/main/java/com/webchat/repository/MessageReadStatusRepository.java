package com.webchat.repository;

import com.webchat.entity.MessageReadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageReadStatusRepository extends JpaRepository<MessageReadStatus, Long> {
    List<MessageReadStatus> findByMessageId(Long messageId);
    boolean existsByMessageIdAndUserId(Long messageId, Long userId);
}
