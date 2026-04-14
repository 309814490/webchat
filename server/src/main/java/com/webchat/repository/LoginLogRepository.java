package com.webchat.repository;

import com.webchat.entity.LoginLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginLogRepository extends JpaRepository<LoginLog, Long> {
    // 根据用户ID查询登录日志（分页）
    Page<LoginLog> findByUserIdOrderByLoginTimeDesc(Long userId, Pageable pageable);

    // 查询指定时间范围内的登录日志
    List<LoginLog> findByLoginTimeBetween(LocalDateTime startTime, LocalDateTime endTime);

    // 查询用户最近的登录记录
    List<LoginLog> findTop10ByUserIdOrderByLoginTimeDesc(Long userId);

    // 统计用户登录失败次数
    long countByUserIdAndLoginStatusAndLoginTimeBetween(
        Long userId,
        LoginLog.LoginStatus loginStatus,
        LocalDateTime startTime,
        LocalDateTime endTime
    );
}
