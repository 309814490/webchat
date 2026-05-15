package com.webchat.repository;

import com.webchat.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, Long> {
    List<UserSession> findByUserIdAndOnlineTrue(Long userId);
    List<UserSession> findByUserId(Long userId);
    Optional<UserSession> findBySessionToken(String sessionToken);
    Optional<UserSession> findByUserIdAndDeviceId(Long userId, String deviceId);
    void deleteByUserIdAndDeviceId(Long userId, String deviceId);
    List<UserSession> findByLastHeartbeatBefore(LocalDateTime time);
}
