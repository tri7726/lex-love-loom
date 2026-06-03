package com.listeningcity.service;

import com.listeningcity.dto.AiTriageResult;
import com.listeningcity.entity.*;
import com.listeningcity.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Hướng A — AI chỉ SUGGEST, KHÔNG tự ASSIGN.
 *
 * Flow:
 *   PENDING → AI_SUGGESTED (conf ≥ 0.85)    → IOC 1-click approve
 *   PENDING → NEEDS_MANUAL_REVIEW (< 0.85)  → IOC review kỹ
 *   PENDING → NEEDS_MANUAL_REVIEW           ← nếu category = SECURITY
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiOrchestratorService {

    private final FeedbackRepository repo;
    private final LlmExecutionService llm;
    private final RagRetrievalService rag;   // bạn tự implement: pgvector / Qdrant / ...

    @Async("aiExecutor")
    @Transactional
    public void analyzeFeedback(UUID feedbackId) {
        Feedback fb = repo.findById(feedbackId).orElse(null);
        if (fb == null) return;

        // SECURITY luôn manual — không để AI quyết
        if (fb.getCategory() == FeedbackCategory.SECURITY) {
            fb.setStatus(FeedbackStatus.NEEDS_MANUAL_REVIEW);
            fb.setAiReasoning("Category SECURITY — bypass AI, forced manual review");
            repo.save(fb);
            return;
        }

        try {
            // 1. RAG: lấy top-K quy định/hướng dẫn liên quan
            List<String> context = rag.retrieve(fb.getDescription(), 5);

            // 2. Gọi LLM với structured output
            AiTriageResult result = llm.classify(fb, context);

            // 3. KHÔNG tự ASSIGN — chỉ suggest
            fb.setAiSuggestedDepartment(result.suggestedDepartment());
            fb.setAiConfidence(result.confidence());
            fb.setAiReasoning(result.reasoning());
            fb.setStatus(result.isHighConfidence()
                    ? FeedbackStatus.AI_SUGGESTED
                    : FeedbackStatus.NEEDS_MANUAL_REVIEW);

            repo.save(fb);
            log.info("AI triage feedback={} suggest={} conf={} status={}",
                    fb.getId(), result.suggestedDepartment(),
                    result.confidence(), fb.getStatus());

        } catch (Exception e) {
            log.error("AI orchestrator failed for feedback={}", feedbackId, e);
            fb.setStatus(FeedbackStatus.NEEDS_MANUAL_REVIEW);
            fb.setAiReasoning("Orchestrator error: " + e.getMessage());
            repo.save(fb);
        }
    }
}
