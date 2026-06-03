package com.listeningcity.config;

import com.listeningcity.security.FeedbackAuthorizationService;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * BOLA Layer 3 — set Postgres GUC mỗi request để RLS hoạt động.
 * Defense in depth: nếu code service có bug, DB vẫn chặn.
 */
@Component
@RequiredArgsConstructor
public class TenantContextInterceptor implements HandlerInterceptor {

    private final JdbcTemplate jdbc;
    private final FeedbackAuthorizationService authz;

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        try {
            var user = authz.currentUser();
            jdbc.execute("SET LOCAL app.user_id   = '" + user.userId() + "'");
            jdbc.execute("SET LOCAL app.user_role = '" + user.role() + "'");
            jdbc.execute("SET LOCAL app.user_dept = '" +
                    (user.department() == null ? "" : user.department().name()) + "'");
        } catch (SecurityException ignored) {
            // public endpoint — skip
        }
        return true;
    }
}
