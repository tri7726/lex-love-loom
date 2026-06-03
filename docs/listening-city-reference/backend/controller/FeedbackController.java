package com.listeningcity.controller;

import com.listeningcity.dto.*;
import com.listeningcity.entity.Department;
import com.listeningcity.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService service;

    @PostMapping
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<FeedbackResponse> create(@Valid @RequestBody CreateFeedbackRequest req) {
        FeedbackResponse created = service.create(req);
        return ResponseEntity.created(URI.create("/api/feedbacks/" + created.id())).body(created);
    }

    @GetMapping("/{id}")
    public FeedbackResponse get(@PathVariable("id") UUID id) {
        return service.getById(id);
    }

    @GetMapping
    public Page<FeedbackResponse> list(@PageableDefault(size = 20) Pageable pageable) {
        return service.list(pageable);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('IOC','ADMIN')")
    public FeedbackResponse approve(@PathVariable("id") UUID id) {
        return service.approveAiSuggestion(id);
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('IOC','ADMIN')")
    public FeedbackResponse assign(@PathVariable("id") UUID id,
                                   @RequestParam Department department) {
        return service.manuallyAssign(id, department);
    }
}
