package com.listeningcity.entity;

public enum FeedbackStatus {
    PENDING,
    AI_SUGGESTED,           // AI confidence ≥ 0.85 → IOC 1-click approve
    NEEDS_MANUAL_REVIEW,    // AI confidence < 0.85 → IOC review kỹ
    ASSIGNED,               // IOC đã duyệt, gán cho department
    IN_PROGRESS,
    RESOLVED,
    REJECTED
}
