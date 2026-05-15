package com.webchat.service;

import com.webchat.entity.UserSession;
import com.webchat.repository.UserSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class UserSessionService {

    @Autowired
    private UserSessionRepository userSessionRepository;

    @Transactional
    public UserSession createSession(Long userId, String deviceId, String deviceType,
                                     String deviceName, String ipAddress, String userAgent) {
        // 检查是否已有该设备的会话
        UserSession session = userSessionRepository.findByUserIdAndDeviceId(userId, deviceId)
                .orElse(new UserSession());

        session.setUserId(userId);
        session.setDeviceId(deviceId);
        session.setDeviceType(deviceType);
        session.setDeviceName(deviceName);
        session.setSessionToken(UUID.randomUUID().toString());
        session.setIpAddress(ipAddress);
        session.setUserAgent(userAgent);
        session.setOnline(true);
        session.setLastHeartbeat(LocalDateTime.now());

        return userSessionRepository.save(session);
    }

    @Transactional
    public void updateHeartbeat(String sessionToken) {
        userSessionRepository.findBySessionToken(sessionToken)
                .ifPresent(session -> {
                    session.setLastHeartbeat(LocalDateTime.now());
                    session.setOnline(true);
                    userSessionRepository.save(session);
                });
    }

    @Transactional
    public void logout(String sessionToken) {
        userSessionRepository.findBySessionToken(sessionToken)
                .ifPresent(session -> {
                    session.setOnline(false);
                    userSessionRepository.save(session);
                });
    }

    @Transactional
    public void logoutDevice(Long userId, String deviceId) {
        userSessionRepository.findByUserIdAndDeviceId(userId, deviceId)
                .ifPresent(session -> {
                    session.setOnline(false);
                    userSessionRepository.save(session);
                });
    }

    public List<UserSession> getUserSessions(Long userId) {
        return userSessionRepository.findByUserId(userId);
    }

    public List<UserSession> getOnlineSessions(Long userId) {
        return userSessionRepository.findByUserIdAndOnlineTrue(userId);
    }

    public boolean isUserOnline(Long userId) {
        return !userSessionRepository.findByUserIdAndOnlineTrue(userId).isEmpty();
    }

    // 定时清理超时会话（5分钟无心跳视为离线）
    @Scheduled(fixedRate = 60000) // 每分钟执行一次
    @Transactional
    public void cleanupInactiveSessions() {
        LocalDateTime timeout = LocalDateTime.now().minusMinutes(5);
        List<UserSession> inactiveSessions = userSessionRepository.findByLastHeartbeatBefore(timeout);

        for (UserSession session : inactiveSessions) {
            if (session.getOnline()) {
                session.setOnline(false);
                userSessionRepository.save(session);
            }
        }
    }
}
