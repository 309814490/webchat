package com.webchat.repository;

import com.webchat.entity.CallRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CallRecordRepository extends JpaRepository<CallRecord, Long> {

    List<CallRecord> findByCallerIdOrCalleeIdOrderByCreatedAtDesc(Long callerId, Long calleeId);

    List<CallRecord> findByConversationIdOrderByCreatedAtDesc(Long conversationId);
}
