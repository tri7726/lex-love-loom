package com.listeningcity.security;

import java.lang.annotation.*;

/**
 * BOLA Layer 2 — annotation đánh dấu method cần check quyền truy cập Feedback.
 * Áp dụng cho mọi method nhận `UUID feedbackId` làm tham số đầu tiên.
 *
 * Cấp 1: Repository query scoped (findByIdScoped)
 * Cấp 2: AOP Aspect (annotation này)  ← bạn đang đọc
 * Cấp 3: Postgres RLS
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface CheckFeedbackAccess {
    /** Tên parameter chứa feedbackId (default = arg đầu tiên kiểu UUID) */
    String paramName() default "feedbackId";
}
