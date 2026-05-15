package com.webchat.repository;

import com.webchat.entity.GroupFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupFileRepository extends JpaRepository<GroupFile, Long> {
    List<GroupFile> findByGroupIdAndDeletedFalseOrderByCreatedAtDesc(Long groupId);
    List<GroupFile> findByGroupIdAndUploaderIdAndDeletedFalseOrderByCreatedAtDesc(Long groupId, Long uploaderId);
}
