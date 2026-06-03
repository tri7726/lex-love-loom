# BOLA / IDOR Test Checklist — FeedbackService

Mọi test case dưới đây PHẢI pass trước khi merge code lên main.

## 1. Citizen ↔ Citizen isolation

| # | Setup | Action | Expected |
|---|---|---|---|
| 1.1 | citizenA tạo feedback F1 | citizenB `GET /api/feedbacks/F1` | **403** (hoặc 404) |
| 1.2 | citizenA tạo F1 | citizenA `GET /api/feedbacks/F1` | **200** |
| 1.3 | citizenA tạo F1 với citizen_id giả mạo trong body | server save F1 với citizen_id = JWT.sub | citizen_id từ JWT thắng |

## 2. Officer ↔ Officer isolation

| # | Setup | Action | Expected |
|---|---|---|---|
| 2.1 | F1 assignedDepartment=POLICE | env-officer `GET /api/feedbacks/F1` | **403** |
| 2.2 | F1 assignedDepartment=POLICE | police-officer `GET /api/feedbacks/F1` | **200** |
| 2.3 | F1 status=PENDING (chưa assign) | police-officer GET list | F1 KHÔNG xuất hiện |

## 3. IOC / Admin override

| # | Action | Expected |
|---|---|---|
| 3.1 | ioc `GET /api/feedbacks` | thấy tất cả |
| 3.2 | citizenA `POST /F1/approve` | **403** |
| 3.3 | ioc `POST /F1/approve` | **200**, status → ASSIGNED |

## 4. IDOR fuzzing

- Lấy token của citizenA, gọi `GET /api/feedbacks/{random-uuid}` 100 lần với UUID khác nhau.
- Expected: 100% trả 403 hoặc 404. KHÔNG được trả 200 với data của user khác.

## 5. Defense layers verification

| Layer | Test |
|---|---|
| L1 — Repo scoped query | Mock service gọi `findByIdScoped(F1, citizenB_id, null, "CITIZEN")` → Optional.empty() |
| L2 — AOP @CheckFeedbackAccess | Disable AOP, gọi service trực tiếp với userB → vẫn không thấy F1 nhờ L1 |
| L3 — Postgres RLS | Connect psql với GUC `app.user_id=citizenB`, `SELECT * FROM feedbacks WHERE id=F1` → 0 rows |

## 6. Edge cases

- [ ] Citizen update feedback của người khác → 403
- [ ] Officer update assignedDepartment (escalation) → 403 (chỉ IOC/Admin được)
- [ ] SQL injection trong `addressText` → ORM thoát, không exec
- [ ] Mass assignment: gửi `status=RESOLVED` trong CreateRequest → bị Zod/Bean Validation strip
- [ ] Race condition: 2 IOC cùng approve 1 feedback → optimistic locking (`@Version`) chặn

## 7. Audit log (REQUIRED)

Mọi truy cập feedback PHẢI log:
- `userId, role, dept, feedbackId, action, result (allow/deny), timestamp`

Log sample:
```
BOLA blocked: user=abc-123 role=OFFICER dept=ENVIRONMENT tried to access feedback=xyz-789 (assigned=POLICE)
```

## 8. Production smoke test

Sau khi deploy:
```bash
# Tạo 2 citizen accounts → A và B
# A tạo feedback → lấy F1 id
# Login B → curl GET /api/feedbacks/F1 → expect 403
```
