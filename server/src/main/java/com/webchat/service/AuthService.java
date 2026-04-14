package com.webchat.service;

import com.webchat.dto.*;
import com.webchat.entity.LoginLog;
import com.webchat.entity.User;
import com.webchat.repository.LoginLogRepository;
import com.webchat.repository.UserRepository;
import com.webchat.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private LoginLogRepository loginLogRepository;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // 检查学号是否已存在
        if (userRepository.existsByStudentId(request.getStudentId())) {
            throw new RuntimeException("学号已存在");
        }

        // 创建新用户
        User user = new User();
        user.setUsername(request.getName());
        user.setStudentId(request.getStudentId());
        user.setIdCard(request.getIdCard());
        user.setPhone(request.getPhone());
        user.setEmail(request.getStudentId() + "@student.edu.cn"); // 自动生成邮箱
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setStatus(User.UserStatus.OFFLINE);

        user = userRepository.save(user);

        // 生成 JWT Token
        String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername());

        return new AuthResponse(token, UserDTO.fromEntity(user));
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        LoginLog loginLog = new LoginLog();
        loginLog.setIpAddress(ipAddress);
        loginLog.setUserAgent(userAgent);

        try {
            User user = userRepository.findByStudentId(request.getStudentId())
                    .orElseThrow(() -> new RuntimeException("学号或密码错误"));

            // 检查用户是否被逻辑删除
            if (user.getDeleted()) {
                loginLog.setUserId(user.getId());
                loginLog.setLoginStatus(LoginLog.LoginStatus.FAILURE);
                loginLog.setFailureReason("账号已被删除");
                loginLogRepository.save(loginLog);
                throw new RuntimeException("账号已被删除");
            }

            if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
                loginLog.setUserId(user.getId());
                loginLog.setLoginStatus(LoginLog.LoginStatus.FAILURE);
                loginLog.setFailureReason("密码错误");
                loginLogRepository.save(loginLog);
                throw new RuntimeException("学号或密码错误");
            }

            user.setStatus(User.UserStatus.ONLINE);
            userRepository.save(user);

            // 记录成功登录日志
            loginLog.setUserId(user.getId());
            loginLog.setLoginStatus(LoginLog.LoginStatus.SUCCESS);
            loginLogRepository.save(loginLog);

            String token = jwtTokenProvider.generateToken(user.getId(), user.getUsername());
            return new AuthResponse(token, UserDTO.fromEntity(user));
        } catch (RuntimeException e) {
            // 如果用户不存在，记录失败日志（不记录userId）
            if (loginLog.getUserId() == null) {
                loginLog.setLoginStatus(LoginLog.LoginStatus.FAILURE);
                loginLog.setFailureReason("用户不存在");
                loginLogRepository.save(loginLog);
            }
            throw e;
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPhone(request.getPhone())
                .orElseThrow(() -> new RuntimeException("手机号或学号错误"));

        // 验证学号是否匹配
        if (!user.getStudentId().equals(request.getStudentId())) {
            throw new RuntimeException("手机号或学号错误");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
