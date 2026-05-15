package com.webchat.repository;

import com.webchat.entity.Blacklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlacklistRepository extends JpaRepository<Blacklist, Long> {
    List<Blacklist> findByUserId(Long userId);
    Optional<Blacklist> findByUserIdAndBlockedUserId(Long userId, Long blockedUserId);
    boolean existsByUserIdAndBlockedUserId(Long userId, Long blockedUserId);
    void deleteByUserIdAndBlockedUserId(Long userId, Long blockedUserId);
}
