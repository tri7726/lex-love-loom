package com.listeningcity.repository;

import com.listeningcity.entity.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FeedbackRepository extends JpaRepository<Feedback, UUID> {

    /**
     * BOLA Layer 1 — query LUÔN kèm scope theo identity của caller.
     * KHÔNG bao giờ gọi findById() raw từ service.
     */
    @Query("""
        SELECT f FROM Feedback f
        WHERE f.id = :id
          AND (
                :userRole IN ('ADMIN', 'IOC')
             OR f.citizenId = :userId
             OR f.assignedDepartment = :userDept
          )
    """)
    Optional<Feedback> findByIdScoped(
            @Param("id") UUID id,
            @Param("userId") UUID userId,
            @Param("userDept") Department userDept,
            @Param("userRole") String userRole
    );

    Page<Feedback> findByCitizenId(UUID citizenId, Pageable pageable);

    Page<Feedback> findByAssignedDepartment(Department dept, Pageable pageable);

    Page<Feedback> findByStatus(FeedbackStatus status, Pageable pageable);
}
