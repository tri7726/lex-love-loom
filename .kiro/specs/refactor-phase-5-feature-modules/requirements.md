# Requirements Document

## Introduction

⚠️ **OPTIONAL PHASE - LOW PRIORITY** ⚠️

Phase 5 là phase OPTIONAL trong chuỗi refactoring, tập trung vào việc consolidate các complex features thành self-contained feature modules. Phase này chỉ nên thực hiện sau khi Phase 1-4 đã hoàn tất và codebase đã ổn định.

Hiện tại, một số features phức tạp (pet system, grammar system, kanji system, video learning) có components, hooks, data, và pages rải rác ở nhiều folders khác nhau. Điều này gây khó khăn trong việc:
- Theo dõi dependencies giữa các phần của cùng một feature
- Tái sử dụng hoặc extract features thành packages riêng
- Onboard developers mới vào specific features
- Maintain và test isolated features

Mục tiêu là tạo feature modules với cấu trúc `src/features/{feature-name}/` chứa tất cả components, hooks, data, và pages liên quan đến feature đó.

**Lưu ý quan trọng:**
- Phase này có thể gây breaking changes lớn nếu không cẩn thận
- Nên thực hiện từng feature module một, test kỹ trước khi chuyển sang feature tiếp theo
- Team có thể skip phase này nếu không thấy cần thiết
- Chỉ thực hiện khi có đủ test coverage để verify không có regression

---

## Glossary

- **Feature_Module**: Self-contained module chứa tất cả code liên quan đến một feature (components, hooks, data, pages)
- **Feature_Consolidator**: Hệ thống thực hiện việc di chuyển và tổ chức feature modules
- **Cross_Feature_Dependency**: Dependency giữa các feature modules khác nhau
- **Public_API**: Interface được export từ feature module qua `index.ts`
- **Feature_Boundary**: Ranh giới rõ ràng giữa các features, giúp giảm coupling
- **Git_History**: Lịch sử commit của file trong Git repository
- **Breaking_Change**: Thay đổi gây lỗi build hoặc runtime

---

## Requirements

### Requirement 1: Tạo Feature Modules Structure

**User Story:** Là developer, tôi muốn có cấu trúc feature modules rõ ràng, để dễ tìm và maintain code liên quan đến một feature cụ thể.

#### Acceptance Criteria

1. THE Feature_Consolidator SHALL tạo folder `src/features/` nếu chưa tồn tại
2. THE Feature_Consolidator SHALL tạo 4 feature modules: `pet-system/`, `grammar-system/`, `kanji-system/`, `video-learning/`
3. WHEN tạo feature module, THE Feature_Consolidator SHALL tạo subfolders: `components/`, `hooks/`, `data/`, `pages/`
4. THE Feature_Consolidator SHALL tạo `index.ts` cho mỗi feature module để export Public_API
5. THE Feature_Consolidator SHALL tạo `README.md` trong mỗi feature module mô tả feature và dependencies

### Requirement 2: Consolidate Pet System Feature

**User Story:** Là developer, tôi muốn tất cả pet-related code được nhóm vào một feature module, để dễ maintain pet system.

#### Acceptance Criteria

1. THE Feature_Consolidator SHALL di chuyển 13 components từ `src/components/pet/` vào `src/features/pet-system/components/`:
   - AdvancedPetRenderer.tsx
   - FloatingPet.tsx
   - FoodShop.tsx
   - PetAdventureHub.tsx
   - PetChatPanel.tsx
   - PetCodex.tsx
   - PetCombatArena.tsx
   - PetCrafting.tsx
   - PetEgg.tsx
   - PetEnvironment.tsx
   - PetTicklingGame.tsx
   - PetWardrobe.tsx
   - PetWidget.tsx
2. THE Feature_Consolidator SHALL di chuyển pet-related hooks vào `src/features/pet-system/hooks/` (nếu tồn tại: usePet.ts, usePetAdventure.ts, usePetCodex.ts, usePetShop.ts)
3. THE Feature_Consolidator SHALL di chuyển pet-related data files vào `src/features/pet-system/data/` (nếu tồn tại: pet-config.ts, pet-recipes.ts)
4. THE Feature_Consolidator SHALL di chuyển PetPage.tsx vào `src/features/pet-system/pages/` (nếu tồn tại)
5. WHEN di chuyển, THE Feature_Consolidator SHALL sử dụng `git mv` để preserve Git_History
6. THE Feature_Consolidator SHALL xóa folder `src/components/pet/` sau khi di chuyển xong

### Requirement 3: Consolidate Grammar System Feature

**User Story:** Là developer, tôi muốn tất cả grammar-related code được nhóm vào một feature module, để dễ maintain grammar system.

#### Acceptance Criteria

1. THE Feature_Consolidator SHALL di chuyển 15 components từ `src/components/grammar/` vào `src/features/grammar-system/components/`:
   - BatchCheckResults.tsx
   - DeepExplanationSheet.tsx
   - GrammarAIPreview.tsx
   - GrammarCard.tsx
   - GrammarComparisonDialog.tsx
   - GrammarDeepDive.tsx
   - GrammarDiff.tsx
   - GrammarDojoDashboard.tsx
   - GrammarMasteryBadge.tsx
   - GrammarPracticeModal.tsx
   - GrammarQuizDrills.tsx
   - GrammarSensei.tsx
   - LevelAssessment.tsx
   - MistakeReviewMode.tsx
   - RewriteComparison.tsx
2. THE Feature_Consolidator SHALL di chuyển grammar-related hooks vào `src/features/grammar-system/hooks/` (nếu tồn tại: useGrammarMastery.ts)
3. THE Feature_Consolidator SHALL di chuyển grammar-related data files vào `src/features/grammar-system/data/` (nếu tồn tại: grammar-db.ts)
4. THE Feature_Consolidator SHALL di chuyển GrammarWiki.tsx vào `src/features/grammar-system/pages/` (nếu tồn tại)
5. WHEN di chuyển, THE Feature_Consolidator SHALL sử dụng `git mv` để preserve Git_History
6. THE Feature_Consolidator SHALL xóa folder `src/components/grammar/` sau khi di chuyển xong

### Requirement 4: Consolidate Kanji System Feature

**User Story:** Là developer, tôi muốn tất cả kanji-related code được nhóm vào một feature module, để dễ maintain kanji system.

#### Acceptance Criteria

1. THE Feature_Consolidator SHALL di chuyển 10 components từ `src/components/kanji/` vào `src/features/kanji-system/components/`:
   - GenkouyoushiGrid.tsx
   - GlobalWritingModal.tsx
   - HandwritingCanvas.tsx
   - KanaStrokeCanvas.tsx
   - KanjiCanvas.tsx
   - KanjiInfoPanel.tsx
   - KanjiNetworkVisualization.tsx
   - KanjiWriterCanvas.tsx
   - VocabularyPanel.tsx
   - WordWritingLab.tsx
2. THE Feature_Consolidator SHALL di chuyển KanjiStrokeOrder.tsx từ `src/components/` vào `src/features/kanji-system/components/` (sau Phase 1)
3. THE Feature_Consolidator SHALL di chuyển KanjiSuggestions.tsx từ `src/components/` vào `src/features/kanji-system/components/` (sau Phase 1)
4. THE Feature_Consolidator SHALL di chuyển kanji-related hooks vào `src/features/kanji-system/hooks/` (nếu tồn tại: useKanjiDetails.ts, useKanjiLookup.ts, useKanjiSearch.ts, useRelatedKanji.ts)
5. THE Feature_Consolidator SHALL di chuyển kanji-related data files vào `src/features/kanji-system/data/` (nếu tồn tại: kanji-db.ts, strokeOrder.ts)
6. THE Feature_Consolidator SHALL di chuyển kanji-related pages vào `src/features/kanji-system/pages/` (nếu tồn tại: KanjiByLevel.tsx, KanjiDetail.tsx, KanjiWorksheet.tsx)
7. WHEN di chuyển, THE Feature_Consolidator SHALL sử dụng `git mv` để preserve Git_History
8. THE Feature_Consolidator SHALL xóa folder `src/components/kanji/` sau khi di chuyển xong

### Requirement 5: Consolidate Video Learning Feature

**User Story:** Là developer, tôi muốn tất cả video-learning-related code được nhóm vào một feature module, để dễ maintain video learning system.

#### Acceptance Criteria

1. THE Feature_Consolidator SHALL di chuyển 8 components từ `src/components/video/` vào `src/features/video-learning/components/`:
   - AnalysisPanel.tsx
   - DictationMode.tsx
   - SpeakingMode.tsx
   - SubtitlePanel.tsx
   - SummaryMode.tsx
   - VideoLearningTabs.tsx
   - VideoMode.tsx
   - VideoQuizMode.tsx
2. THE Feature_Consolidator SHALL di chuyển video-related hooks vào `src/features/video-learning/hooks/` (nếu tồn tại: useYouTubePlayer.ts)
3. THE Feature_Consolidator SHALL di chuyển VideoLearning.tsx vào `src/features/video-learning/pages/` (nếu tồn tại)
4. WHEN di chuyển, THE Feature_Consolidator SHALL sử dụng `git mv` để preserve Git_History
5. THE Feature_Consolidator SHALL xóa folder `src/components/video/` sau khi di chuyển xong

### Requirement 6: Cập Nhật Import Statements

**User Story:** Là developer, tôi muốn tất cả imports được cập nhật tự động, để không phải sửa thủ công từng file.

#### Acceptance Criteria

1. WHEN một file được di chuyển vào feature module, THE Feature_Consolidator SHALL tìm tất cả files import file đó trong toàn bộ codebase
2. THE Feature_Consolidator SHALL cập nhật imports từ `@/components/{old-folder}/ComponentName` sang `@/features/{feature-name}/components/ComponentName`
3. THE Feature_Consolidator SHALL cập nhật imports từ `@/hooks/useHookName` sang `@/features/{feature-name}/hooks/useHookName`
4. THE Feature_Consolidator SHALL cập nhật imports từ `@/pages/PageName` sang `@/features/{feature-name}/pages/PageName`
5. THE Feature_Consolidator SHALL cập nhật imports từ `@/data/dataFile` sang `@/features/{feature-name}/data/dataFile`
6. THE Feature_Consolidator SHALL cập nhật cả relative imports
7. Round-trip property: WHEN build sau khi cập nhật imports, THE Feature_Consolidator SHALL đảm bảo không có import errors

### Requirement 7: Tạo Feature Module Index Files

**User Story:** Là developer, tôi muốn có index files để import từ feature modules dễ dàng hơn và control Public_API.

#### Acceptance Criteria

1. THE Feature_Consolidator SHALL tạo `index.ts` trong root của mỗi feature module
2. THE index.ts SHALL re-export các components, hooks, và utilities quan trọng nhất
3. THE index.ts SHALL KHÔNG export internal implementation details
4. THE index.ts SHALL sử dụng named exports
5. THE index.ts SHALL có comments mô tả Public_API của feature

### Requirement 8: Tạo Feature Module README

**User Story:** Là developer, tôi muốn có documentation cho mỗi feature module, để hiểu feature và dependencies của nó.

#### Acceptance Criteria

1. THE Feature_Consolidator SHALL tạo `README.md` trong root của mỗi feature module
2. THE README.md SHALL mô tả purpose của feature
3. THE README.md SHALL list các main components và hooks
4. THE README.md SHALL document Cross_Feature_Dependency (nếu có)
5. THE README.md SHALL có examples về cách sử dụng feature

### Requirement 9: Cập Nhật Path Aliases

**User Story:** Là developer, tôi muốn có path aliases cho features, để imports ngắn gọn và rõ ràng hơn.

#### Acceptance Criteria

1. THE Feature_Consolidator SHALL cập nhật `tsconfig.json` để thêm path alias `@/features/*`
2. THE Feature_Consolidator SHALL cập nhật `vite.config.ts` để thêm resolve alias cho `@/features`
3. WHEN path aliases được cập nhật, THE Feature_Consolidator SHALL verify TypeScript compiler nhận diện aliases
4. THE Feature_Consolidator SHALL prefer imports qua aliases thay vì relative paths

### Requirement 10: Handle Cross-Feature Dependencies

**User Story:** Là developer, tôi muốn Cross_Feature_Dependency được quản lý rõ ràng, để tránh circular dependencies.

#### Acceptance Criteria

1. WHEN phát hiện Cross_Feature_Dependency, THE Feature_Consolidator SHALL document nó trong README.md
2. THE Feature_Consolidator SHALL kiểm tra không có circular dependencies giữa feature modules
3. IF circular dependency được phát hiện, THE Feature_Consolidator SHALL báo lỗi và suggest refactoring
4. THE Feature_Consolidator SHALL prefer one-way dependencies (feature A depends on feature B, nhưng B không depend on A)

### Requirement 11: Incremental Migration Strategy

**User Story:** Là developer, tôi muốn migrate từng feature module một, để giảm risk và dễ rollback nếu có vấn đề.

#### Acceptance Criteria

1. THE Feature_Consolidator SHALL migrate features theo thứ tự: pet-system → grammar-system → kanji-system → video-learning
2. WHEN hoàn thành migration một feature, THE Feature_Consolidator SHALL chạy build và tests trước khi chuyển sang feature tiếp theo
3. THE Feature_Consolidator SHALL tạo separate Git commit cho mỗi feature migration
4. THE Feature_Consolidator SHALL có rollback plan cho mỗi feature migration
5. Idempotence property: Chạy migration hai lần SHALL cho kết quả giống nhau

### Requirement 12: Validation và Testing

**User Story:** Là developer, tôi muốn đảm bảo feature modules không gây breaking changes.

#### Acceptance Criteria

1. WHEN migration hoàn tất, THE Feature_Consolidator SHALL chạy TypeScript compiler để kiểm tra type errors
2. WHEN migration hoàn tất, THE Feature_Consolidator SHALL chạy build command (`npm run build` hoặc `vite build`)
3. WHEN migration hoàn tất, THE Feature_Consolidator SHALL chạy existing tests (nếu có)
4. IF build hoặc tests fail, THE Feature_Consolidator SHALL rollback migration
5. THE Feature_Consolidator SHALL kiểm tra không còn imports trỏ đến old paths
6. THE Feature_Consolidator SHALL verify tất cả pages vẫn render đúng

### Requirement 13: Preserve Code Logic

**User Story:** Là developer, tôi muốn đảm bảo logic code không bị thay đổi trong quá trình migration.

#### Acceptance Criteria

1. THE Feature_Consolidator SHALL NOT thay đổi nội dung bên trong các files
2. THE Feature_Consolidator SHALL NOT rename files
3. THE Feature_Consolidator SHALL NOT thay đổi component exports (default vs named)
4. THE Feature_Consolidator SHALL NOT thay đổi component props hoặc APIs
5. THE Feature_Consolidator SHALL chỉ thay đổi file location và import paths

### Requirement 14: Update Routing Configuration

**User Story:** Là developer, tôi muốn routing configuration được cập nhật để reflect feature modules structure.

#### Acceptance Criteria

1. WHEN pages được di chuyển vào feature modules, THE Feature_Consolidator SHALL cập nhật route imports trong routing configuration
2. THE Feature_Consolidator SHALL cập nhật lazy loading imports (nếu có)
3. THE Feature_Consolidator SHALL verify tất cả routes vẫn hoạt động đúng
4. THE Feature_Consolidator SHALL update route paths nếu cần (optional)

### Requirement 15: Cleanup Old Structure

**User Story:** Là developer, tôi muốn old folders được cleanup sau khi migration thành công, để tránh confusion.

#### Acceptance Criteria

1. WHEN migration một feature hoàn tất và verified, THE Feature_Consolidator SHALL xóa old component folders
2. THE Feature_Consolidator SHALL xóa old hook files (nếu đã di chuyển)
3. THE Feature_Consolidator SHALL xóa old data files (nếu đã di chuyển)
4. THE Feature_Consolidator SHALL xóa old page files (nếu đã di chuyển)
5. THE Feature_Consolidator SHALL verify không còn references đến old paths trước khi xóa

---

## Dependencies & Constraints

- **Prerequisites**: Phase 1-4 phải hoàn tất trước khi bắt đầu Phase 5
- **Optional**: Phase này là OPTIONAL và có thể skip nếu team không thấy cần thiết
- **Low Priority**: Chỉ thực hiện khi codebase đã ổn định và có đủ test coverage
- Sử dụng `git mv` thay vì `mv` để preserve git history
- TypeScript strict mode phải được maintain
- Build tool: Vite với path alias `@/` trỏ đến `src/`
- Phải có rollback plan cho mỗi feature migration
- Nên có test coverage tốt trước khi bắt đầu
- Migrate từng feature một, không migrate tất cả cùng lúc
- Tạo separate Git commits cho mỗi feature migration
- Phải test kỹ sau mỗi feature migration trước khi chuyển sang feature tiếp theo

---

## Out of Scope

- Refactoring logic bên trong components, hooks, hoặc pages
- Thay đổi component APIs hoặc props
- Tối ưu hóa performance
- Thêm tests mới (nhưng phải chạy existing tests)
- Refactoring các features khác ngoài 4 features được chỉ định
- Thay đổi naming conventions
- Tạo shared utilities giữa features (có thể làm trong phase sau)
- Migration database hoặc API changes

---

## Risk Assessment

### High Risks
1. **Breaking Changes**: Di chuyển nhiều files có thể gây breaking changes lớn
   - Mitigation: Migrate từng feature một, test kỹ sau mỗi migration
2. **Circular Dependencies**: Feature modules có thể tạo circular dependencies
   - Mitigation: Document dependencies, check for cycles, prefer one-way dependencies
3. **Import Errors**: Cập nhật imports có thể miss một số files
   - Mitigation: Scan toàn bộ codebase, use TypeScript compiler để verify

### Medium Risks
1. **Git History Loss**: Có thể mất git history nếu không dùng `git mv`
   - Mitigation: Luôn dùng `git mv`, verify history sau khi di chuyển
2. **Rollback Difficulty**: Rollback có thể khó nếu đã commit nhiều changes
   - Mitigation: Separate commits cho mỗi feature, có rollback plan

### Low Risks
1. **Performance Impact**: Feature modules có thể ảnh hưởng bundle size
   - Mitigation: Monitor bundle size, use code splitting nếu cần

---

## Success Criteria

Phase 5 được coi là thành công khi:
1. ✅ Tất cả 4 feature modules được tạo với cấu trúc rõ ràng
2. ✅ Tất cả components, hooks, data, và pages được di chuyển đúng vị trí
3. ✅ Tất cả imports được cập nhật và không có import errors
4. ✅ Build thành công không có errors
5. ✅ Existing tests pass (nếu có)
6. ✅ Tất cả pages render đúng
7. ✅ Git history được preserve
8. ✅ Old folders được cleanup
9. ✅ Documentation (README.md) được tạo cho mỗi feature
10. ✅ Path aliases được cập nhật trong tsconfig.json và vite.config.ts

---

## Alternative Approach

Nếu team quyết định KHÔNG thực hiện Phase 5, có thể consider các alternatives:

1. **Keep Current Structure**: Giữ nguyên structure hiện tại sau Phase 1-4
   - Pros: Ít risk, không cần migration effort
   - Cons: Khó theo dõi feature boundaries, khó extract features

2. **Partial Migration**: Chỉ migrate 1-2 features quan trọng nhất
   - Pros: Giảm risk, ít effort hơn
   - Cons: Inconsistent structure

3. **Virtual Feature Modules**: Dùng comments và documentation để define feature boundaries
   - Pros: Không cần di chuyển files
   - Cons: Không enforce boundaries, dễ vi phạm

Team nên discuss và quyết định approach phù hợp nhất với context và priorities của project.
