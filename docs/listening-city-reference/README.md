# The Listening City — Reference Code (Hướng A: AI Suggestion + IOC Approval)

> Tài liệu tham khảo cho đồ án **The Listening City System**. Code dưới đây **KHÔNG chạy trong project Lovable hiện tại** (project này là React/Japanese learning). Copy sang IntelliJ (Spring Boot) hoặc project React riêng để dùng.

## Nội dung

```
docs/listening-city-reference/
├── README.md                 ← bạn đang đọc
├── BOLA_TEST_CHECKLIST.md    ← checklist bảo mật BOLA/IDOR
├── sql/
│   └── 001_feedbacks.sql     ← schema + RLS Postgres
├── backend/                  ← Spring Boot 3 + Java 17
│   ├── entity/               ← JPA entities + enums
│   ├── dto/                  ← Request/Response DTOs
│   ├── repository/
│   ├── service/              ← FeedbackService + LlmExecutionService + AiOrchestrator
│   ├── controller/
│   ├── security/             ← BOLA Guard 3 lớp (AOP + Service + Annotation)
│   └── config/               ← Async + RestClient
└── frontend/                 ← React + TS + shadcn/ui
    ├── pages/
    ├── components/
    └── schemas/
```

## Hướng triển khai đã chọn: **Hướng A — AI Suggestion**

- AI **không tự động ASSIGN** feedback cho cơ quan.
- AI chỉ **gợi ý** (`AI_SUGGESTED`) hoặc đẩy về `NEEDS_MANUAL_REVIEW`.
- **IOC luôn là người approve cuối** trước khi `ASSIGNED`.
- → Tránh được rủi ro pháp lý "AI giao việc không có văn bản".

### Flow trạng thái

```
PENDING                          ← Citizen vừa tạo
   ↓ (AI orchestrator)
AI_SUGGESTED (confidence ≥ 0.85) ← IOC 1-click approve
   hoặc
NEEDS_MANUAL_REVIEW (< 0.85)     ← IOC review kỹ
   ↓ (IOC approve)
ASSIGNED → IN_PROGRESS → RESOLVED
```

## Chấm điểm dự án

| Tiêu chí | Trước | Sau khi áp Hướng A |
|---|---:|---:|
| Tính sáng tạo kỹ thuật | 8/10 | 8/10 |
| Tính khả thi MVP 3 tháng | 7/10 | 8/10 |
| Tính thực tiễn (hành chính) | 4/10 | **8/10** |
| Khả năng deploy thật | 3/10 | 6/10 |
| Resume value | 9/10 | 9/10 |
| **TỔNG** | **6.5/10** | **8/10** |

## Các loại Feedback ưu tiên trong MVP

1. **WASTE** — Rác thải, vệ sinh môi trường (an toàn nhất)
2. **TREE** — Cây xanh gãy đổ
3. **FLOOD** — Ngập nước, thoát nước
4. **PARKING** — Trật tự đô thị, lấn chiếm (nhạy cảm hơn)
5. **SECURITY** — An ninh nghiêm trọng (⚠️ AI **không** auto-suggest, luôn → `NEEDS_MANUAL_REVIEW`)

## Stack

- **Backend**: Java 17, Spring Boot 3.2, Spring Security 6, JPA/Hibernate, PostgreSQL 16 + pgvector, Spring AOP
- **AI**: OpenAI-compatible API (qua Lovable AI Gateway hoặc tự host Ollama), structured output bằng JSON Schema
- **Frontend**: React 18, Vite, TanStack Router, shadcn/ui, react-hook-form + zod, Leaflet

## Dùng như thế nào

1. Tạo project Spring Boot mới trong IntelliJ (Spring Initializr: Web, Security, JPA, Validation, AOP, PostgreSQL Driver).
2. Copy `backend/` vào `src/main/java/com/listeningcity/`, đổi package nếu cần.
3. Chạy `sql/001_feedbacks.sql` trên Postgres.
4. Set env: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `JWT_SECRET`.
5. Copy `frontend/` vào project React riêng.
