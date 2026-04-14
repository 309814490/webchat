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

    @Query("SELECT c FROM Conversation c WHERE c.type = 'PRIVATE' AND c.id IN (SELECT cm1.conversationId FROM ConversationMember cm1 WHERE cm1.userId = :userId1) AND c.id IN (SELECT cm2.conversationId FROM ConversationMember cm2 WHERE cm2.userId = :userId2) ORDER BY c.id ASC")
    List<Conversation> findPrivateConversations(@Param("userId1") Long userId1, @Param("userId2") Long userId2);
}
