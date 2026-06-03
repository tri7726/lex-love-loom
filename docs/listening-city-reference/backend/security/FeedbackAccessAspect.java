package com.listeningcity.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.UUID;

/**
 * BOLA Layer 2 — Spring AOP enforce trước khi method service chạy.
 * Bắt mọi @CheckFeedbackAccess và chặn nếu user không có quyền.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class FeedbackAccessAspect {

    private final FeedbackAuthorizationService authz;

    @Around("@annotation(com.listeningcity.security.CheckFeedbackAccess)")
    public Object enforce(ProceedingJoinPoint pjp) throws Throwable {
        MethodSignature sig = (MethodSignature) pjp.getSignature();
        Method method = sig.getMethod();
        CheckFeedbackAccess ann = method.getAnnotation(CheckFeedbackAccess.class);

        UUID feedbackId = extractFeedbackId(pjp, sig, ann.paramName());
        var user = authz.currentUser();

        if (!authz.canAccess(user, feedbackId)) {
            log.warn("BOLA blocked: user={} role={} dept={} tried to access feedback={}",
                    user.userId(), user.role(), user.department(), feedbackId);
            throw new AccessDeniedException("BOLA: not authorized for feedback " + feedbackId);
        }
        return pjp.proceed();
    }

    private UUID extractFeedbackId(ProceedingJoinPoint pjp, MethodSignature sig, String paramName) {
        String[] names = sig.getParameterNames();
        Object[] args = pjp.getArgs();
        for (int i = 0; i < names.length; i++) {
            if (names[i].equals(paramName) && args[i] instanceof UUID id) return id;
        }
        // Fallback: arg đầu tiên kiểu UUID
        for (Object a : args) if (a instanceof UUID id) return id;
        throw new IllegalStateException("@CheckFeedbackAccess: no UUID param '" + paramName + "' found");
    }
}
