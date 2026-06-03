package com.listeningcity.dto;

import com.listeningcity.entity.Department;

import java.math.BigDecimal;

/**
 * Structured output từ LLM. LLM được force trả về đúng schema qua JSON Schema mode.
 */
public record AiTriageResult(
        Department suggestedDepartment,
        BigDecimal confidence,    // 0.00 - 1.00
        String reasoning,
        String urgency            // LOW | MEDIUM | HIGH | CRITICAL
) {
    public boolean isHighConfidence() {
        return confidence != null && confidence.doubleValue() >= 0.85;
    }
}
