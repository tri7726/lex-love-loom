package com.listeningcity.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.listeningcity.dto.AiTriageResult;
import com.listeningcity.entity.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Gọi LLM (OpenAI-compatible: Lovable AI Gateway / Ollama / Groq...)
 * + structured output (JSON Schema) để tránh parse rủi ro.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LlmExecutionService {

    private final RestClient llmClient;        // configured trong AiConfig
    private final ObjectMapper mapper;

    @Value("${llm.model:google/gemini-2.5-flash}")
    private String model;

    private static final String SYSTEM_PROMPT = """
        Bạn là AI điều phối phản ánh của công dân cho hệ thống quản lý đô thị.
        Nhiệm vụ: đọc phản ánh + tài liệu tham chiếu, xác định cơ quan nào nên xử lý.

        Quy tắc:
        - WASTE (rác, vệ sinh)          → ENVIRONMENT
        - TREE (cây gãy đổ)             → ENVIRONMENT
        - FLOOD (ngập, thoát nước)      → WARD
        - PARKING (lấn chiếm, đậu xe)   → POLICE
        - SECURITY                      → KHÔNG tự suggest, confidence luôn = 0.0
                                          (chuyển IOC review thủ công)
        - Không chắc chắn                → confidence < 0.85

        Trả về STRICTLY theo JSON schema. Không thêm chữ ngoài JSON.
        """;

    /**
     * Phân loại 1 feedback.
     */
    public AiTriageResult classify(Feedback fb, List<String> ragContext) {
        String userPrompt = """
            ## Phản ánh
            Tiêu đề: %s
            Mô tả: %s
            Category citizen tự chọn: %s
            Địa chỉ: %s

            ## Tài liệu tham chiếu (RAG top-K)
            %s
            """.formatted(
                fb.getTitle(),
                fb.getDescription(),
                fb.getCategory(),
                fb.getAddressText() != null ? fb.getAddressText() : "(không có)",
                String.join("\n---\n", ragContext)
        );

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userPrompt)
                ),
                "response_format", Map.of(
                        "type", "json_schema",
                        "json_schema", Map.of(
                                "name", "triage_result",
                                "strict", true,
                                "schema", Map.of(
                                        "type", "object",
                                        "additionalProperties", false,
                                        "required", List.of("suggestedDepartment", "confidence", "reasoning", "urgency"),
                                        "properties", Map.of(
                                                "suggestedDepartment", Map.of("type", "string",
                                                        "enum", List.of("POLICE", "ENVIRONMENT", "WARD")),
                                                "confidence",          Map.of("type", "number", "minimum", 0, "maximum", 1),
                                                "reasoning",           Map.of("type", "string", "maxLength", 1000),
                                                "urgency",             Map.of("type", "string",
                                                        "enum", List.of("LOW", "MEDIUM", "HIGH", "CRITICAL"))
                                        )
                                )
                        )
                ),
                "temperature", 0.1
        );

        try {
            JsonNode resp = llmClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            String content = resp.path("choices").get(0).path("message").path("content").asText();
            JsonNode parsed = mapper.readTree(content);

            return new AiTriageResult(
                    Department.valueOf(parsed.path("suggestedDepartment").asText()),
                    new BigDecimal(parsed.path("confidence").asText()),
                    parsed.path("reasoning").asText(),
                    parsed.path("urgency").asText("MEDIUM")
            );
        } catch (Exception e) {
            log.error("LLM call failed for feedback={}", fb.getId(), e);
            // Fallback an toàn: đẩy về manual review
            return new AiTriageResult(null, BigDecimal.ZERO,
                    "AI failed: " + e.getMessage(), "MEDIUM");
        }
    }
}
