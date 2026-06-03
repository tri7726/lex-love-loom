package com.listeningcity.security;

import com.listeningcity.entity.*;
import com.listeningcity.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FeedbackAuthorizationService {

    private final FeedbackRepository repo;

    public AuthUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new SecurityException("Unauthenticated");
        }
        // Giả sử bạn nhét AuthUser vào principal trong JwtAuthFilter
        return (AuthUser) auth.getPrincipal();
    }

    /**
     * Kiểm tra user có quyền truy cập feedback hay không.
     * Rules:
     *  - ADMIN, IOC: full access
     *  - CITIZEN: chỉ feedback do chính mình tạo
     *  - OFFICER (Police/Env/Ward): chỉ feedback assignedDepartment khớp
     */
    public boolean canAccess(AuthUser user, UUID feedbackId) {
        return repo.findByIdScoped(
                feedbackId,
                user.userId(),
                user.department(),
                user.role()
        ).isPresent();
    }

    public record AuthUser(UUID userId, String role, Department department) {}
}
