package com.webchat.repository;

import com.webchat.entity.GroupAnnouncement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupAnnouncementRepository extends JpaRepository<GroupAnnouncement, Long> {
    List<GroupAnnouncement> findByGroupIdAndDeletedFalseOrderByCreatedAtDesc(Long groupId);

    Optional<GroupAnnouncement> findFirstByGroupIdAndDeletedFalseOrderByCreatedAtDesc(Long groupId);
}
