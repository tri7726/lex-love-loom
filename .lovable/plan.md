# Kế hoạch code — "AI Triage Assistant for 1022" (Hướng A)

> ⚠️ Lưu ý: Project Lovable hiện tại là **React/Japanese learning** (không phải Spring Boot). Code dưới đây sẽ được **tạo dưới dạng tài liệu tham khảo** trong thư mục mới `docs/listening-city-reference/` để bạn copy sang IntelliJ. Không động vào codebase Lovable đang chạy.

---

## 1. Cấu trúc thư mục sẽ tạo

```text
docs/listening-city-reference/
├── README.md                              # Tổng quan + hướng dẫn copy sang IntelliJ
├── backend/
│   ├── entity/
│   │   ├── Feedback.java                  # JPA entity + enums
│   │   ├── FeedbackStatus.java            # PENDING, AI_SUGGESTED, ASSIGNED, IN_PROGRESS, RESOLVED, NEEDS_MANUAL_REVIEW
│   │   ├── Department.java                # POLICE, ENVIRONMENT, WARD, IOC, ADMIN
│   │   └── FeedbackCategory.java          # WASTE, TREE, FLOOD, PARKING, SECURITY...
│   ├── dto/
│   │   ├── CreateFeedbackRequest.java     # + Bean Validation (@NotBlank, @Size)
│   │   ├── FeedbackResponse.java
│   │   └── AiTriageResult.java
│   ├── repository/
│   │   └── FeedbackRepository.java        # Query method theo assignedDepartment
│   ├── service/
│   │   ├── FeedbackService.java           # CRUD + BOLA guard
│   │   ├── LlmExecutionService.java       # Gọi LLM + RAG + confidence routing
│   │   └── AiOrchestratorService.java     # @Async trigger sau khi tạo feedback
│   ├── controller/
│   │   └── FeedbackController.java        # POST /api/feedbacks, GET, PATCH
│   ├── security/
│   │   ├── FeedbackAuthorizationService.java   # Logic chống BOLA/IDOR
│   │   ├── @CheckFeedbackAccess.java           # Custom annotation
│   │   └── FeedbackAccessAspect.java           # Spring AOP enforce
│   └── config/
│       └── AsyncConfig.java               # ThreadPoolTaskExecutor cho AI calls
└── frontend/
    ├── pages/CreateFeedback.tsx           # Form chính (shadcn/ui)
    ├── components/
    │   ├── CategoryTemplateSelector.tsx   # Template + keyword matching client-side
    │   ├── ImageUploader.tsx              # Multi-image + preview
    │   └── LocationPicker.tsx             # GPS auto-fill
    └── schemas/feedback.schema.ts         # Zod validation
```

---

## 2. Điểm nhấn từng phần (technical highlights)

### A. Backend — Feedback API
- **Entity `Feedback`**: `id, citizenId, title, description, category, status, assignedDepartment, aiSuggestedDepartment, aiConfidence (0-1), aiReasoning, images (jsonb), location (PostGIS point), createdAt, updatedAt`
- **POST `/api/feedbacks`**:
  1. `@PreAuthorize("hasRole('CITIZEN')")`
  2. Validate DTO bằng `@Valid`
  3. Save với `status=PENDING, citizenId=SecurityContext.userId`
  4. `aiOrchestratorService.triggerAsync(savedId)` → return 201 ngay
- **Transaction**: `@Transactional` ở service layer, không ở controller.

### B. AI Orchestrator (Hướng A — chỉ Suggest, không Auto-Assign)

```java
@Async("aiExecutor")
public void analyzeFeedback(UUID feedbackId) {
    Feedback fb = repo.findById(feedbackId).orElseThrow();

    // 1. RAG: query vector DB lấy top-K quy định liên quan
    List<String> context = ragService.retrieve(fb.getDescription(), 5);

    // 2. Gọi LLM với structured output (JSON schema)
    AiTriageResult result = llmClient.classify(fb, context);
    // result = { suggestedDept, confidence, reasoning, urgency }

    // 3. KHÔNG tự ASSIGN — chỉ đánh dấu để IOC duyệt
    fb.setAiSuggestedDepartment(result.dept());
    fb.setAiConfidence(result.confidence());
    fb.setAiReasoning(result.reasoning());
    fb.setStatus(result.confidence() >= 0.85
        ? FeedbackStatus.AI_SUGGESTED      // IOC review nhanh
        : FeedbackStatus.NEEDS_MANUAL_REVIEW); // IOC review kỹ
    repo.save(fb);
}
```

- **LLM call**: dùng `RestClient` (Spring 6.1+) hoặc `WebClient`, timeout 30s, retry 2 lần với exponential backoff.
- **Prompt template**: system prompt nhúng các quy định + few-shot examples cho 4 loại (WASTE, TREE, FLOOD, PARKING). Tránh đưa loại SECURITY nghiêm trọng vào auto-flow.
- **Structured output**: dùng JSON Schema để force LLM trả về đúng format → parse an toàn.
- **Confidence threshold**: 0.85 (cao) → IOC chỉ "1-click approve"; <0.85 → IOC phải đọc kỹ.

### C. Frontend — Form gửi phản ánh

- **Stack**: `react-hook-form` + `zod` + `shadcn/ui`
- **UX tối ưu hành chính**:
  - Chọn category trước → load template có sẵn ("Phản ánh đống rác tại...") → giảm input rác
  - Keyword matching client-side: gõ "rác" → gợi ý category WASTE
  - Image upload có nén client-side (browser-image-compression) trước khi POST
  - Geolocation auto-fill, có nút "chỉnh thủ công" trên bản đồ (Leaflet)
- **Submit flow**: optimistic UI → show "Đã gửi, AI đang phân tích..." → poll status mỗi 5s trong 30s đầu

### D. BOLA/IDOR Guard cho FeedbackService

3 lớp bảo vệ chồng nhau:

**Lớp 1 — Repository query luôn kèm scope:**
```java
@Query("SELECT f FROM Feedback f WHERE f.id = :id AND " +
       "(f.citizenId = :userId OR " +
       " f.assignedDepartment = :userDept OR " +
       " :userRole IN ('ADMIN','IOC'))")
Optional<Feedback> findByIdScoped(UUID id, UUID userId, Department userDept, Role userRole);
```
→ Không bao giờ có `findById()` raw trong service.

**Lớp 2 — AOP Aspect enforce trước khi vào method:**
```java
@Around("@annotation(CheckFeedbackAccess)")
public Object enforce(ProceedingJoinPoint pjp) {
    UUID feedbackId = extractId(pjp);
    AuthUser user = SecurityContextHolder.getContext()...;
    if (!authService.canAccess(user, feedbackId))
        throw new AccessDeniedException("BOLA blocked");
    return pjp.proceed();
}
```

**Lớp 3 — DB-level (Postgres RLS) — defense in depth:**
```sql
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY dept_isolation ON feedbacks
  USING (
    citizen_id = current_setting('app.user_id')::uuid
    OR assigned_department = current_setting('app.user_dept')
    OR current_setting('app.user_role') IN ('ADMIN','IOC')
  );
```
Set GUC trong `HandlerInterceptor` mỗi request → nếu code có bug, DB vẫn chặn.

**Test coverage bắt buộc**:
- `policeUser_cannotRead_environmentFeedback()` → expect 403
- `citizen_cannotRead_otherCitizenFeedback()` → expect 403
- `iocUser_canReadAll()` → expect 200
- Test bằng IDOR fuzzing: thử 100 UUID random với token của user thường

---

## 3. Nhận xét bổ sung (sẽ ghi trong README.md)

- **Chấm điểm hiện tại: 6.5/10** → sau khi áp Hướng A có thể nâng lên **8/10** trước hội đồng.
- **3 điểm sẽ nhấn mạnh khi bảo vệ**:
  1. "AI không thay người, AI hỗ trợ IOC" — né được câu hỏi pháp lý
  2. "3-layer BOLA defense (Repo + AOP + RLS)" — điểm cộng security
  3. "Confidence threshold + Human-in-the-loop" — đúng best practice MLOps
- **3 điểm yếu cần thừa nhận chủ động** (đỡ bị hỏi):
  1. Chưa tích hợp VNeID → "scope MVP, có roadmap"
  2. Chưa map hết cấu trúc cơ quan thật → "demo dùng 4 role flatten, production sẽ mở rộng"
  3. Chưa có chữ ký số cho audit log → "có ghi log đầy đủ, chữ ký số là phase 2"

---

## 4. Thứ tự deliverable

1. Tạo `docs/listening-city-reference/README.md` (tổng quan + cách dùng)
2. Backend Java files (8 files)
3. Frontend TSX files (4 files)
4. SQL migration mẫu cho Postgres + RLS
5. File `BOLA_TEST_CHECKLIST.md` — checklist test bảo mật

Sau khi bạn approve, tôi sẽ tạo toàn bộ trong 1 lượt build.
