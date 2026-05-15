package com.webchat.service;

import com.webchat.dto.FriendRequestDTO;
import com.webchat.dto.SearchUserRequest;
import com.webchat.dto.UserDTO;
import com.webchat.entity.FriendRequest;
import com.webchat.entity.Friendship;
import com.webchat.entity.User;
import com.webchat.entity.Blacklist;
import com.webchat.repository.BlacklistRepository;
import com.webchat.repository.FriendRequestRepository;
import com.webchat.repository.FriendshipRepository;
import com.webchat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class FriendService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Autowired
    private BlacklistRepository blacklistRepository;

    public UserDTO searchUser(SearchUserRequest request) {
        User user;
        if ("studentId".equals(request.getType())) {
            user = userRepository.findByStudentId(request.getValue())
                    .orElseThrow(() -> new RuntimeException("用户不存在"));
        } else if ("phone".equals(request.getType())) {
            user = userRepository.findByPhone(request.getValue())
                    .orElseThrow(() -> new RuntimeException("用户不存在"));
        } else {
            throw new RuntimeException("无效的搜索类型");
        }

        if (user.getDeleted()) {
            throw new RuntimeException("用户不存在");
        }

        return UserDTO.fromEntity(user);
    }

    @Transactional
    public void sendFriendRequest(Long fromUserId, Long toUserId) {
        if (fromUserId.equals(toUserId)) {
            throw new RuntimeException("不能添加自己为好友");
        }

        // Check if already friends
        if (friendshipRepository.existsByUserIdAndFriendId(fromUserId, toUserId)) {
            throw new RuntimeException("已经是好友关系");
        }

        // Check if request already exists
        if (friendRequestRepository.findByFromUserIdAndToUserId(fromUserId, toUserId).isPresent()) {
            throw new RuntimeException("好友请求已发送");
        }

        // Check if reverse request exists
        if (friendRequestRepository.findByFromUserIdAndToUserId(toUserId, fromUserId).isPresent()) {
            throw new RuntimeException("对方已向您发送好友请求");
        }

        FriendRequest request = new FriendRequest();
        request.setFromUserId(fromUserId);
        request.setToUserId(toUserId);
        request.setStatus(FriendRequest.RequestStatus.PENDING);
        friendRequestRepository.save(request);
    }

    @Transactional
    public void acceptFriendRequest(Long requestId, Long userId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("好友请求不存在"));

        if (!request.getToUserId().equals(userId)) {
            throw new RuntimeException("无权操作此请求");
        }

        if (request.getStatus() != FriendRequest.RequestStatus.PENDING) {
            throw new RuntimeException("请求已处理");
        }

        request.setStatus(FriendRequest.RequestStatus.ACCEPTED);
        friendRequestRepository.save(request);

        // Create bidirectional friendship
        Friendship friendship1 = new Friendship();
        friendship1.setUserId(request.getFromUserId());
        friendship1.setFriendId(request.getToUserId());

        Friendship friendship2 = new Friendship();
        friendship2.setUserId(request.getToUserId());
        friendship2.setFriendId(request.getFromUserId());

        friendshipRepository.saveAll(List.of(friendship1, friendship2));
    }

    @Transactional
    public void rejectFriendRequest(Long requestId, Long userId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("好友请求不存在"));

        if (!request.getToUserId().equals(userId)) {
            throw new RuntimeException("无权操作此请求");
        }

        if (request.getStatus() != FriendRequest.RequestStatus.PENDING) {
            throw new RuntimeException("请求已处理");
        }

        request.setStatus(FriendRequest.RequestStatus.REJECTED);
        friendRequestRepository.save(request);
    }

    public List<UserDTO> getFriendList(Long userId) {
        List<Friendship> friendships = friendshipRepository.findByUserId(userId);
        List<Long> friendIds = friendships.stream()
                .map(Friendship::getFriendId)
                .collect(Collectors.toList());

        return userRepository.findAllById(friendIds).stream()
                .filter(user -> !user.getDeleted())
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<FriendRequestDTO> getPendingRequests(Long userId) {
        List<FriendRequest> requests = friendRequestRepository.findByToUserIdAndStatus(userId, FriendRequest.RequestStatus.PENDING);

        // 批量获取所有发送者信息（消除 N+1）
        List<Long> fromUserIds = requests.stream().map(FriendRequest::getFromUserId).toList();
        Map<Long, User> userMap = userRepository.findAllById(fromUserIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return requests.stream().map(request -> {
            User fromUser = userMap.get(request.getFromUserId());
            if (fromUser == null) throw new RuntimeException("用户不存在");
            UserDTO fromUserDTO = UserDTO.fromEntity(fromUser);
            return FriendRequestDTO.fromEntity(request, fromUserDTO);
        }).collect(Collectors.toList());
    }

    // ===== 好友备注 =====

    @Transactional
    public void updateRemark(Long userId, Long friendId, String remark) {
        Friendship friendship = friendshipRepository.findByUserIdAndFriendId(userId, friendId)
                .orElseThrow(() -> new RuntimeException("好友关系不存在"));
        friendship.setRemark(remark);
        friendshipRepository.save(friendship);
    }

    public List<Map<String, Object>> getFriendListWithRemark(Long userId) {
        List<Friendship> friendships = friendshipRepository.findByUserId(userId);
        List<Long> friendIds = friendships.stream()
                .map(Friendship::getFriendId)
                .collect(Collectors.toList());

        Map<Long, String> remarkMap = friendships.stream()
                .collect(Collectors.toMap(Friendship::getFriendId, f -> f.getRemark() != null ? f.getRemark() : ""));

        return userRepository.findAllById(friendIds).stream()
                .filter(user -> !user.getDeleted())
                .map(user -> {
                    Map<String, Object> data = new java.util.HashMap<>();
                    data.put("id", user.getId());
                    data.put("username", user.getUsername());
                    data.put("studentId", user.getStudentId());
                    data.put("avatarUrl", user.getAvatarUrl());
                    data.put("remark", remarkMap.getOrDefault(user.getId(), ""));
                    return data;
                })
                .collect(Collectors.toList());
    }

    // ===== 删除好友 =====

    @Transactional
    public void deleteFriend(Long userId, Long friendId) {
        if (!friendshipRepository.existsByUserIdAndFriendId(userId, friendId)) {
            throw new RuntimeException("好友关系不存在");
        }
        friendshipRepository.deleteByUserIdAndFriendId(userId, friendId);
        friendshipRepository.deleteByUserIdAndFriendId(friendId, userId);
    }

    // ===== 黑名单 =====

    @Transactional
    public void blockUser(Long userId, Long blockedUserId) {
        if (userId.equals(blockedUserId)) {
            throw new RuntimeException("不能拉黑自己");
        }
        if (blacklistRepository.existsByUserIdAndBlockedUserId(userId, blockedUserId)) {
            throw new RuntimeException("已在黑名单中");
        }
        Blacklist blacklist = new Blacklist();
        blacklist.setUserId(userId);
        blacklist.setBlockedUserId(blockedUserId);
        blacklistRepository.save(blacklist);

        // 同时删除好友关系
        friendshipRepository.findByUserIdAndFriendId(userId, blockedUserId)
                .ifPresent(f -> {
                    friendshipRepository.deleteByUserIdAndFriendId(userId, blockedUserId);
                    friendshipRepository.deleteByUserIdAndFriendId(blockedUserId, userId);
                });
    }

    @Transactional
    public void unblockUser(Long userId, Long blockedUserId) {
        blacklistRepository.deleteByUserIdAndBlockedUserId(userId, blockedUserId);
    }

    public List<UserDTO> getBlacklist(Long userId) {
        List<Blacklist> blacklist = blacklistRepository.findByUserId(userId);
        List<Long> blockedIds = blacklist.stream().map(Blacklist::getBlockedUserId).toList();
        return userRepository.findAllById(blockedIds).stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public boolean isBlocked(Long userId, Long targetUserId) {
        return blacklistRepository.existsByUserIdAndBlockedUserId(userId, targetUserId);
    }
}
