# Implementation Plan: Phase 2 - Reorganize Pages

## Overview

This refactoring reorganizes the `src/pages/` directory by moving 43 loose page files into 13 route groups by feature domain. The implementation uses `git mv` to preserve history, updates all imports across the codebase, and ensures zero breaking changes with comprehensive validation.

## Tasks

- [x] 1. Pre-flight validation and setup
  - Verify git working directory is clean (no uncommitted changes)
  - Verify all 43 loose page files exist at expected locations
  - Verify existing subfolders (admin/, student/, teacher/) exist
  - Run initial build to establish baseline: `npm run build`
  - _Requirements: 19.1, 19.2_

- [x] 2. Create new route group folders
  - [x] 2.1 Create 10 new route group folders with parentheses naming convention
    - Create folders: `(core)/`, `(learning)/`, `(practice)/`, `(exams)/`, `(games)/`, `(social)/`, `(community)/`, `(profile)/`, `(pet)/`, `(shop)/`, `(ai)/`, `(management)/`
    - Use `mkdir -p src/pages/{(core),(learning),(practice),(exams),(games),(social),(community),(profile),(pet),(shop),(ai),(management)}`
    - _Requirements: 1.1, 1.4_
  
  - [ ]* 2.2 Write property test for route group naming convention
    - **Property 9: Route Group Naming Convention**
    - **Validates: Requirements 1.1, 1.2, 1.4**

- [-] 3. Rename existing subfolders to match route group convention
  - [x] 3.1 Rename existing subfolders using git mv
    - Rename `src/pages/admin/` to `src/pages/(admin)/`
    - Rename `src/pages/student/` to `src/pages/(student)/`
    - Rename `src/pages/teacher/` to `src/pages/(teacher)/`
    - Use `git mv` to preserve history
    - _Requirements: 1.2, 15.1, 15.2, 15.3_
  
  - [ ]* 3.2 Write property test for renamed folder content preservation
    - **Property 10: Renamed Folder Content Preservation**
    - **Validates: Requirements 15.4**

- [x] 4. Move core pages to (core)/ route group
  - [x] 4.1 Move 4 core pages using git mv
    - Move Index.tsx, Auth.tsx, NotFound.tsx, UserGuide.tsx to `src/pages/(core)/`
    - Use `git mv src/pages/Index.tsx src/pages/(core)/` for each file
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 4.2 Update all imports for core pages
    - Find all files importing core pages using ripgrep
    - Update absolute imports: `@/pages/Index` → `@/pages/(core)/Index`
    - Update relative imports: `../pages/Index` → `../pages/(core)/Index`
    - Update lazy imports in App.tsx: `import('./pages/Index')` → `import('./pages/(core)/Index')`
    - _Requirements: 16.1, 16.2, 16.3, 17.1, 17.2, 17.3_
  
  - [ ]* 4.3 Write property test for git history preservation
    - **Property 1: Git History Preservation**
    - **Validates: Requirements 2.5, 3.2, 4.4, 5.4, 6.4, 7.2, 8.3, 9.3, 10.2, 11.2, 12.2, 13.3, 14.5, 15.3**

- [x] 5. Move learning content pages to (learning)/ route group
  - [x] 5.1 Move 10 learning pages using git mv
    - Move GrammarWiki.tsx, KanjiByLevel.tsx, KanjiDetail.tsx, MinnaVocabulary.tsx, Reading.tsx, SavedVocabulary.tsx, SpeakingPractice.tsx, UnitContent.tsx, VideoLearning.tsx, Vocabulary.tsx to `src/pages/(learning)/`
    - Use `git mv` for each file
    - _Requirements: 3.1, 3.2_
  
  - [x] 5.2 Update all imports for learning pages
    - Find and update all imports across codebase
    - Update absolute, relative, and lazy imports
    - _Requirements: 16.1, 16.2, 17.1, 17.2, 17.3_

- [x] 6. Move practice pages to (practice)/ route group
  - [x] 6.1 Move 3 practice pages using git mv
    - Move QuickMode.tsx, SRSReview.tsx, PresentationViewer.tsx to `src/pages/(practice)/`
    - Use `git mv` for each file
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 6.2 Update all imports for practice pages
    - Find and update all imports across codebase
    - _Requirements: 16.1, 16.2, 17.1, 17.2, 17.3_

- [x] 7. Move exam pages to (exams)/ route group
  - [x] 7.1 Move 3 exam pages using git mv
    - Move JLPTMockExam.tsx, MockTestCenter.tsx, KanjiWorksheet.tsx to `src/pages/(exams)/`
    - Use `git mv` for each file
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 7.2 Update all imports for exam pages
    - Find and update all imports across codebase
    - _Requirements: 16.1, 16.2, 17.1, 17.2, 17.3_

- [x] 8. Move game pages to (games)/ route group
  - [x] 8.1 Move 3 game pages using git mv
    - Move BossBattle.tsx, KanjiBattleArena.tsx, PvPBattle.tsx to `src/pages/(games)/`
    - Use `git mv` for each file
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 8.2 Update all imports for game pages
    - Find and update all imports across codebase
    - _Requirements: 16.1, 16.2, 17.1, 17.2, 17.3_

- [x] 9. Move social feature pages to (social)/ route group
  - [x] 9.1 Move 8 social pages using git mv
    - Move Achievements.tsx, Challenges.tsx, Chat.tsx, Friends.tsx, LeaderboardPage.tsx, Leagues.tsx, SquadDetail.tsx, Squads.tsx to `src/pages/(social)/`
    - Use `git mv` for each file
    - _Requirements: 7.1, 7.2_
  
  - [x] 9.2 Update all imports for social pages
    - Find and update all imports across codebase
    - _Requirements: 16.1, 16.2, 17.1, 17.2, 17.3_

- [x] 10. Move community, profile, pet, shop, AI, and management pages
  - [x] 10.1 Move community pages using git mv
    - Move CommunityDecks.tsx, CommunityLibrary.tsx to `src/pages/(community)/`
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 10.2 Move profile pages using git mv
    - Move EditProfile.tsx, UserProfile.tsx to `src/pages/(profile)/`
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 10.3 Move pet page using git mv
    - Move PetPage.tsx to `src/pages/(pet)/`
    - _Requirements: 10.1, 10.2_
  
  - [x] 10.4 Move shop page using git mv
    - Move SakuraShop.tsx to `src/pages/(shop)/`
    - _Requirements: 11.1, 11.2_
  
  - [x] 10.5 Move AI page using git mv
    - Move SenseiHub.tsx to `src/pages/(ai)/`
    - _Requirements: 12.1, 12.2_
  
  - [x] 10.6 Move management pages using git mv
    - Move FolderManager.tsx, ModuleManager.tsx to `src/pages/(management)/`
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [x] 10.7 Update all imports for these pages
    - Find and update all imports across codebase for all moved pages
    - _Requirements: 16.1, 16.2, 17.1, 17.2, 17.3_

- [x] 11. Move admin pages to (admin)/ route group
  - [x] 11.1 Move 3 admin pages using git mv
    - Move AdminDashboard.tsx, AdminExamManager.tsx, AdminImport.tsx to `src/pages/(admin)/`
    - Use `git mv` for each file
    - _Requirements: 14.1, 14.2, 14.3, 14.5_
  
  - [x] 11.2 Update all imports for admin pages
    - Find and update all imports across codebase
    - _Requirements: 16.1, 16.2, 17.1, 17.2, 17.3_

- [x] 12. Checkpoint - Verify all moves complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Comprehensive import validation
  - [x] 13.1 Verify no old import patterns remain
    - Search for old import patterns using ripgrep
    - Verify no imports reference old paths (e.g., `@/pages/Index` without route group)
    - _Requirements: 16.4, 17.4, 19.4_
  
  - [ ]* 13.2 Write property test for import path update completeness
    - **Property 3: Import Path Update Completeness**
    - **Validates: Requirements 16.1, 16.2, 17.1, 17.2, 17.3, 17.4, 19.4**
  
  - [ ]* 13.3 Write property test for lazy loading pattern preservation
    - **Property 5: Lazy Loading Pattern Preservation**
    - **Validates: Requirements 16.3**

- [x] 14. Route definition validation
  - [x] 14.1 Verify all route paths unchanged
    - Check that URL paths in route definitions remain identical
    - Verify only import references changed, not path props
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  
  - [ ]* 14.2 Write property test for route path invariance
    - **Property 6: Route Path Invariance**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.4**

- [x] 15. File content and structure validation
  - [x] 15.1 Verify no loose files remain at src/pages/ root
    - Check that all page files are in route groups
    - Verify count of loose files is zero
    - _Requirements: 1.3_
  
  - [ ]* 15.2 Write property test for no loose files at root
    - **Property 2: No Loose Files at Root**
    - **Validates: Requirements 1.3**
  
  - [ ]* 15.3 Write property test for file content invariance
    - **Property 8: File Content Invariance**
    - **Validates: Requirements 20.1, 20.2, 20.3, 20.4, 20.5**

- [x] 16. Build and TypeScript validation
  - [x] 16.1 Run TypeScript compiler check
    - Execute `npx tsc --noEmit` to verify no type errors
    - _Requirements: 19.1_
  
  - [x] 16.2 Run full build
    - Execute `npm run build` to verify no build errors
    - _Requirements: 19.2, 19.3_
  
  - [ ]* 16.3 Write property test for build success after refactoring
    - **Property 4: Build Success After Import Updates**
    - **Validates: Requirements 16.4, 19.2, 19.3**

- [ ] 17. Idempotence validation
  - [ ]* 17.1 Write property test for refactoring idempotence
    - **Property 7: Idempotence of Refactoring**
    - **Validates: Requirements 19.5**

- [x] 18. Final checkpoint and commit
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster completion
- Each task references specific requirements for traceability
- Use `git mv` exclusively to preserve git history
- Update imports incrementally after each group move
- Validate TypeScript compilation and build after all moves complete
- Property tests validate universal correctness properties across all 43 pages
- Checkpoints ensure incremental validation and provide opportunity for user feedback
