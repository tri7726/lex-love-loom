package com.listeningcity.dto;

import com.listeningcity.entity.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record FeedbackResponse(
        UUID id,
        UUID citizenId,
        String title,
        String description,
        FeedbackCategory category,
        FeedbackStatus status,
        Department assignedDepartment,
        Department aiSuggestedDepartment,
        BigDecimal aiConfidence,
        String aiReasoning,
        List<String> images,
        String addressText,
        Double lat,
        Double lng,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime resolvedAt
) {
    public static FeedbackResponse from(Feedback f) {
        return new FeedbackResponse(
                f.getId(), f.getCitizenId(), f.getTitle(), f.getDescription(),
                f.getCategory(), f.getStatus(),
                f.getAssignedDepartment(), f.getAiSuggestedDepartment(),
                f.getAiConfidence(), f.getAiReasoning(),
                f.getImages(), f.getAddressText(), f.getLat(), f.getLng(),
                f.getCreatedAt(), f.getUpdatedAt(), f.getResolvedAt()
        );
    }
}
