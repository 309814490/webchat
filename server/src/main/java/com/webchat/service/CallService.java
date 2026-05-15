package com.webchat.service;

import com.webchat.entity.CallRecord;
import com.webchat.repository.CallRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class CallService {

    @Autowired
    private CallRecordRepository callRecordRepository;

    public CallRecord createCallRecord(Long callerId, Long calleeId, Long conversationId, CallRecord.CallType callType) {
        CallRecord record = new CallRecord();
        record.setCallerId(callerId);
        record.setCalleeId(calleeId);
        record.setConversationId(conversationId);
        record.setCallType(callType);
        record.setCallStatus(CallRecord.CallStatus.RINGING);
        return callRecordRepository.save(record);
    }

    public CallRecord acceptCall(Long callId) {
        CallRecord record = callRecordRepository.findById(callId)
                .orElseThrow(() -> new RuntimeException("通话记录不存在"));
        record.setCallStatus(CallRecord.CallStatus.CONNECTED);
        record.setStartTime(LocalDateTime.now());
        return callRecordRepository.save(record);
    }

    public CallRecord endCall(Long callId, String reason) {
        CallRecord record = callRecordRepository.findById(callId)
                .orElseThrow(() -> new RuntimeException("通话记录不存在"));

        record.setEndTime(LocalDateTime.now());
        record.setEndReason(reason);

        if (record.getCallStatus() == CallRecord.CallStatus.CONNECTED && record.getStartTime() != null) {
            int duration = (int) ChronoUnit.SECONDS.between(record.getStartTime(), record.getEndTime());
            record.setDuration(duration);
            record.setCallStatus(CallRecord.CallStatus.ENDED);
        } else if (record.getCallStatus() == CallRecord.CallStatus.RINGING) {
            switch (reason) {
                case "rejected" -> record.setCallStatus(CallRecord.CallStatus.REJECTED);
                case "cancelled" -> record.setCallStatus(CallRecord.CallStatus.CANCELLED);
                default -> record.setCallStatus(CallRecord.CallStatus.MISSED);
            }
        }

        return callRecordRepository.save(record);
    }

    public List<CallRecord> getUserCallHistory(Long userId) {
        return callRecordRepository.findByCallerIdOrCalleeIdOrderByCreatedAtDesc(userId, userId);
    }

    public List<CallRecord> getConversationCallHistory(Long conversationId) {
        return callRecordRepository.findByConversationIdOrderByCreatedAtDesc(conversationId);
    }
}
