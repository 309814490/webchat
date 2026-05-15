package com.webchat.service;

import com.webchat.entity.Message;
import com.webchat.entity.MessageFavorite;
import com.webchat.repository.MessageFavoriteRepository;
import com.webchat.repository.MessageRepository;
import com.webchat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessageFavoriteService {

    @Autowired
    private MessageFavoriteRepository messageFavoriteRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public void addFavorite(Long userId, Long messageId) {
        if (messageFavoriteRepository.existsByUserIdAndMessageId(userId, messageId)) {
            throw new RuntimeException("已收藏该消息");
        }

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("消息不存在"));

        if (Boolean.TRUE.equals(message.getRecalled())) {
            throw new RuntimeException("已撤回的消息不能收藏");
        }

        MessageFavorite favorite = new MessageFavorite();
        favorite.setUserId(userId);
        favorite.setMessageId(messageId);
        favorite.setConversationId(message.getConversationId());
        favorite.setContent(message.getContent());
        favorite.setType(message.getType());
        favorite.setMetadata(message.getMetadata());

        userRepository.findById(message.getSenderId())
                .ifPresent(sender -> favorite.setSenderName(sender.getUsername()));

        messageFavoriteRepository.save(favorite);
    }

    @Transactional
    public void removeFavorite(Long userId, Long favoriteId) {
        messageFavoriteRepository.deleteByIdAndUserId(favoriteId, userId);
    }

    public Page<MessageFavorite> getFavorites(Long userId, int page, int size) {
        size = Math.min(size, 100);
        return messageFavoriteRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
    }
}
