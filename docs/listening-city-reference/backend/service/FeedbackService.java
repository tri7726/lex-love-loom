package com.listeningcity.service;

import com.listeningcity.dto.*;
import com.listeningcity.entity.*;
import com.listeningcity.repository.FeedbackRepository;
import com.listeningcity.security.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository repo;
    private final FeedbackAuthorizationService authz;
    private final AiOrchestratorService aiOrchestrator;

    /**
     * Citizen tạo feedback mới.
     * Status PENDING → trigger AI bất đồng bộ → return ngay.
     */
    @Transactional
    public FeedbackResponse create(CreateFeedbackRequest req) {
        var user = authz.currentUser();
        if (!"CITIZEN".equals(user.role())) {
            throw new SecurityException("Only citizens can create feedback");
        }

        Feedback fb = Feedback.builder()
                .citizenId(user.userId())     // ← cố định từ JWT, KHÔNG nhận từ request
                .title(req.title())
                .description(req.description())
                .category(req.category())
                .status(FeedbackStatus.PENDING)
                .images(req.images())
                .lat(req.lat())
                .lng(req.lng())
                .addressText(req.addressText())
                .build();

        Feedback saved = repo.save(fb);
        log.info("Feedback created id={} citizen={} category={}",
                saved.getId(), saved.getCitizenId(), saved.getCategory());

        // Fire & forget — AI chạy nền
        aiOrchestrator.analyzeFeedback(saved.getId());

        return FeedbackResponse.from(saved);
    }

    /**
     * Lấy 1 feedback — bảo vệ bằng @CheckFeedbackAccess + query scoped.
     */
    @CheckFeedbackAccess
    @Transactional(readOnly = true)
    public FeedbackResponse getById(UUID feedbackId) {
        var user = authz.currentUser();
        Feedback fb = repo.findByIdScoped(
                feedbackId, user.userId(), user.department(), user.role()
        ).orElseThrow(() -> new SecurityException("Feedback not found or access denied"));
        return FeedbackResponse.from(fb);
    }

    /**
     * List feedbacks theo role:
     *  - CITIZEN: chỉ feedback của mình
     *  - OFFICER (POLICE/ENV/WARD): chỉ feedback assignedDepartment khớp
     *  - IOC/ADMIN: tất cả
     */
    @Transactional(readOnly = true)
    public Page<FeedbackResponse> list(Pageable pageable) {
        var user = authz.currentUser();
        Page<Feedback> page = switch (user.role()) {
            case "ADMIN", "IOC" -> repo.findAll(pageable);
            case "CITIZEN"      -> repo.findByCitizenId(user.userId(), pageable);
            case "OFFICER"      -> repo.findByAssignedDepartment(user.department(), pageable);
            default             -> Page.empty(pageable);
        };
        return page.map(FeedbackResponse::from);
    }

    /**
     * IOC duyệt AI suggestion → ASSIGNED.
     */
    @CheckFeedbackAccess
    @Transactional
    public FeedbackResponse approveAiSuggestion(UUID feedbackId) {
        var user = authz.currentUser();
        if (!"IOC".equals(user.role()) && !"ADMIN".equals(user.role())) {
            throw new SecurityException("Only IOC can approve");
        }
        Feedback fb = repo.findById(feedbackId).orElseThrow();
        if (fb.getAiSuggestedDepartment() == null) {
            throw new IllegalStateException("No AI suggestion to approve");
        }
        fb.setAssignedDepartment(fb.getAiSuggestedDepartment());
        fb.setStatus(FeedbackStatus.ASSIGNED);
        return FeedbackResponse.from(repo.save(fb));
    }

    /**
     * IOC override AI suggestion với dept khác.
     */
    @CheckFeedbackAccess
    @Transactional
    public FeedbackResponse manuallyAssign(UUID feedbackId, Department dept) {
        var user = authz.currentUser();
        if (!"IOC".equals(user.role()) && !"ADMIN".equals(user.role())) {
            throw new SecurityException("Only IOC can assign");
        }
        Feedback fb = repo.findById(feedbackId).orElseThrow();
        fb.setAssignedDepartment(dept);
        fb.setStatus(FeedbackStatus.ASSIGNED);
        return FeedbackResponse.from(repo.save(fb));
    }
}
