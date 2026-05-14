package com.webchat.repository;

import com.webchat.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {
    @Query("SELECT c FROM Conversation c JOIN ConversationMember cm ON c.id = cm.conversationId WHERE cm.userId = :userId ORDER BY c.updatedAt DESC")
    List<Conversation> findByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM Conversation c " +
           "JOIN ConversationMember cm1 ON c.id = cm1.conversationId AND cm1.userId = :userId1 " +
           "JOIN ConversationMember cm2 ON c.id = cm2.conversationId AND cm2.userId = :userId2 " +
           "WHERE c.type = 'PRIVATE' ORDER BY c.id ASC")
    List<Conversation> findPrivateConversations(@Param("userId1") Long userId1, @Param("userId2") Long userId2);
}
