package com.webchat.repository;

import com.webchat.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    Page<Message> findByConversationIdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);

    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId ORDER BY m.createdAt DESC")
    List<Message> findLatestByConversationId(@Param("conversationId") Long conversationId, Pageable pageable);

    Optional<Message> findFirstByConversationIdOrderByCreatedAtDesc(Long conversationId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversationId = :conversationId AND m.senderId != :userId AND m.createdAt > (SELECT cm.lastReadAt FROM ConversationMember cm WHERE cm.conversationId = :conversationId AND cm.userId = :userId)")
    Long countUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);

    // 增量加载：获取指定消息ID之后的新消息
    @Query("SELECT m FROM Message m WHERE m.conversationId = :conversationId AND m.id > :lastMessageId ORDER BY m.createdAt ASC")
    List<Message> findNewMessages(@Param("conversationId") Long conversationId, @Param("lastMessageId") Long lastMessageId);
}
