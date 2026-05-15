package com.webchat.repository;

import com.webchat.entity.MessageFavorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MessageFavoriteRepository extends JpaRepository<MessageFavorite, Long> {
    Page<MessageFavorite> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    Optional<MessageFavorite> findByUserIdAndMessageId(Long userId, Long messageId);
    boolean existsByUserIdAndMessageId(Long userId, Long messageId);
    void deleteByIdAndUserId(Long id, Long userId);
}
