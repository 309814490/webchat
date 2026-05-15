package com.webchat.service;

import com.webchat.entity.UserSettings;
import com.webchat.repository.UserSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserSettingsService {

    @Autowired
    private UserSettingsRepository userSettingsRepository;

    public UserSettings getUserSettings(Long userId) {
        return userSettingsRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserSettings settings = new UserSettings();
                    settings.setUserId(userId);
                    settings.setNotificationEnabled(true);
                    settings.setNotificationSound(true);
                    settings.setNotificationVibrate(true);
                    settings.setNotificationPreview(true);
                    return userSettingsRepository.save(settings);
                });
    }

    @Transactional
    public UserSettings updateUserSettings(Long userId, UserSettings updates) {
        UserSettings settings = getUserSettings(userId);

        if (updates.getNotificationEnabled() != null) {
            settings.setNotificationEnabled(updates.getNotificationEnabled());
        }
        if (updates.getNotificationSound() != null) {
            settings.setNotificationSound(updates.getNotificationSound());
        }
        if (updates.getNotificationVibrate() != null) {
            settings.setNotificationVibrate(updates.getNotificationVibrate());
        }
        if (updates.getNotificationPreview() != null) {
            settings.setNotificationPreview(updates.getNotificationPreview());
        }

        return userSettingsRepository.save(settings);
    }
}
