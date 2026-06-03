package com.listeningcity.dto;

import com.listeningcity.entity.FeedbackCategory;
import jakarta.validation.constraints.*;

import java.util.List;

public record CreateFeedbackRequest(
        @NotBlank @Size(min = 5, max = 255) String title,
        @NotBlank @Size(min = 10, max = 5000) String description,
        @NotNull FeedbackCategory category,
        @Size(max = 10) List<@Pattern(regexp = "https?://.+") String> images,
        @DecimalMin("-90") @DecimalMax("90") Double lat,
        @DecimalMin("-180") @DecimalMax("180") Double lng,
        @Size(max = 500) String addressText
) {}
