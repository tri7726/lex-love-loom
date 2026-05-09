# Requirements Document

## Introduction

Phase 2 của refactoring tập trung vào việc tổ chức lại cấu trúc thư mục `src/pages/` để cải thiện khả năng bảo trì và tìm kiếm. Hiện tại có 43 page files nằm rời ở root level của `src/pages/`, gây khó khăn trong việc quản lý và tìm kiếm. Mục tiêu là nhóm các files này vào các subfolder theo feature domains, đồng thời đảm bảo không có breaking changes, preserve git history, và giữ nguyên URL routes.

Refactoring này là bước tiếp theo sau Phase 1 (components reorganization), tiếp tục cải thiện cấu trúc codebase.

---

## Glossary

- **Page_Reorganizer**: Hệ thống thực hiện việc di chuyển pages và cập nhật imports/routes
- **Loose_File**: Page file nằm trực tiếp ở `src/pages/` root level (không trong subfolder)
- **Route_Group**: Subfolder với naming convention `(folder-name)` để indicate organizational grouping (Next.js style)
- **Import_Path**: Đường dẫn import trong TypeScript/JavaScript (ví dụ: `./pages/Auth`)
- **Route_Definition**: Khai báo route trong React Router (ví dụ: `<Route path="/auth" element={<Auth />} />`)
- **Git_History**: Lịch sử commit của file trong Git repository
- **Breaking_Change**: Thay đổi gây lỗi build, runtime, hoặc thay đổi URL
- **Feature_Domain**: Nhóm pages theo chức năng nghiệp vụ (core, learning, practice, exams, games, social, etc.)

---

## Requirements

### Requirement 1: Tạo Cấu Trúc Route Groups Mới

**User Story:** Là developer, tôi muốn các pages được nhóm theo feature domains rõ ràng, để tôi có thể tìm và maintain chúng dễ dàng hơn.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL tạo 13 Route_Groups mới trong `src/pages/`: `(core)/`, `(learning)/`, `(practice)/`, `(exams)/`, `(games)/`, `(social)/`, `(community)/`, `(profile)/`, `(pet)/`, `(shop)/`, `(ai)/`, `(management)/`, `(admin)/`
2. THE Page_Reorganizer SHALL rename 2 subfolders hiện có: `admin/` → `(admin)/`, `student/` → `(student)/`, `teacher/` → `(teacher)/`
3. WHEN tất cả files được di chuyển, `src/pages/` root level SHALL chỉ chứa Route_Groups, không còn loose files
4. THE Page_Reorganizer SHALL sử dụng naming convention `(folder-name)` với dấu ngoặc đơn để indicate organizational grouping

### Requirement 2: Di Chuyển Core Pages

**User Story:** Là developer, tôi muốn các core pages (landing, auth, error) được nhóm riêng, để dễ quản lý entry points.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `Index.tsx` vào `src/pages/(core)/`
2. THE Page_Reorganizer SHALL di chuyển `Auth.tsx` vào `src/pages/(core)/`
3. THE Page_Reorganizer SHALL di chuyển `NotFound.tsx` vào `src/pages/(core)/`
4. THE Page_Reorganizer SHALL di chuyển `UserGuide.tsx` vào `src/pages/(core)/`
5. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 3: Di Chuyển Learning Content Pages

**User Story:** Là developer, tôi muốn các learning content pages được nhóm riêng, để dễ phát triển learning features.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển 10 files vào `src/pages/(learning)/`: `GrammarWiki.tsx`, `KanjiByLevel.tsx`, `KanjiDetail.tsx`, `MinnaVocabulary.tsx`, `Reading.tsx`, `SavedVocabulary.tsx`, `SpeakingPractice.tsx`, `UnitContent.tsx`, `VideoLearning.tsx`, `Vocabulary.tsx`
2. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 4: Di Chuyển Practice & Review Pages

**User Story:** Là developer, tôi muốn các practice và review pages được nhóm riêng, để dễ maintain practice features.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `QuickMode.tsx` vào `src/pages/(practice)/`
2. THE Page_Reorganizer SHALL di chuyển `SRSReview.tsx` vào `src/pages/(practice)/`
3. THE Page_Reorganizer SHALL di chuyển `PresentationViewer.tsx` vào `src/pages/(practice)/`
4. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 5: Di Chuyển Exam & Test Pages

**User Story:** Là developer, tôi muốn các exam và test pages được nhóm riêng, để dễ maintain assessment features.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `JLPTMockExam.tsx` vào `src/pages/(exams)/`
2. THE Page_Reorganizer SHALL di chuyển `MockTestCenter.tsx` vào `src/pages/(exams)/`
3. THE Page_Reorganizer SHALL di chuyển `KanjiWorksheet.tsx` vào `src/pages/(exams)/`
4. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 6: Di Chuyển Game Pages

**User Story:** Là developer, tôi muốn các game pages được nhóm riêng, để dễ phát triển gamification features.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `BossBattle.tsx` vào `src/pages/(games)/`
2. THE Page_Reorganizer SHALL di chuyển `KanjiBattleArena.tsx` vào `src/pages/(games)/`
3. THE Page_Reorganizer SHALL di chuyển `PvPBattle.tsx` vào `src/pages/(games)/`
4. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 7: Di Chuyển Social Feature Pages

**User Story:** Là developer, tôi muốn các social feature pages được nhóm riêng, để dễ maintain social interactions.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển 8 files vào `src/pages/(social)/`: `Achievements.tsx`, `Challenges.tsx`, `Chat.tsx`, `Friends.tsx`, `LeaderboardPage.tsx`, `Leagues.tsx`, `SquadDetail.tsx`, `Squads.tsx`
2. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 8: Di Chuyển Community Content Pages

**User Story:** Là developer, tôi muốn các community content pages được nhóm riêng, để dễ maintain user-generated content features.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `CommunityDecks.tsx` vào `src/pages/(community)/`
2. THE Page_Reorganizer SHALL di chuyển `CommunityLibrary.tsx` vào `src/pages/(community)/`
3. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 9: Di Chuyển Profile Pages

**User Story:** Là developer, tôi muốn các profile pages được nhóm riêng, để dễ maintain user profile features.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `EditProfile.tsx` vào `src/pages/(profile)/`
2. THE Page_Reorganizer SHALL di chuyển `UserProfile.tsx` vào `src/pages/(profile)/`
3. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 10: Di Chuyển Pet System Page

**User Story:** Là developer, tôi muốn pet system page được nhóm riêng, để dễ maintain pet features.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `PetPage.tsx` vào `src/pages/(pet)/`
2. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 11: Di Chuyển Shop Page

**User Story:** Là developer, tôi muốn shop page được nhóm riêng, để dễ maintain monetization features.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `SakuraShop.tsx` vào `src/pages/(shop)/`
2. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 12: Di Chuyển AI Feature Page

**User Story:** Là developer, tôi muốn AI feature page được nhóm riêng, để dễ phát triển AI-powered features.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `SenseiHub.tsx` vào `src/pages/(ai)/`
2. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 13: Di Chuyển Content Management Pages

**User Story:** Là developer, tôi muốn các content management pages được nhóm riêng, để dễ maintain admin tools.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `FolderManager.tsx` vào `src/pages/(management)/`
2. THE Page_Reorganizer SHALL di chuyển `ModuleManager.tsx` vào `src/pages/(management)/`
3. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 14: Di Chuyển Admin Pages vào Route Group

**User Story:** Là developer, tôi muốn admin pages được nhóm theo naming convention mới, để consistent với các Route_Groups khác.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL di chuyển `AdminDashboard.tsx` vào `src/pages/(admin)/`
2. THE Page_Reorganizer SHALL di chuyển `AdminExamManager.tsx` vào `src/pages/(admin)/`
3. THE Page_Reorganizer SHALL di chuyển `AdminImport.tsx` vào `src/pages/(admin)/`
4. THE Page_Reorganizer SHALL rename folder `admin/` thành `(admin)/` nếu folder đã tồn tại
5. WHEN di chuyển, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 15: Rename Existing Subfolders

**User Story:** Là developer, tôi muốn các subfolders hiện có được rename theo naming convention mới, để consistent với toàn bộ cấu trúc.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL rename `src/pages/student/` thành `src/pages/(student)/`
2. THE Page_Reorganizer SHALL rename `src/pages/teacher/` thành `src/pages/(teacher)/`
3. WHEN rename, THE Page_Reorganizer SHALL sử dụng `git mv` để preserve Git_History
4. THE Page_Reorganizer SHALL giữ nguyên tất cả files bên trong các folders này

### Requirement 16: Cập Nhật Import Statements trong App.tsx

**User Story:** Là developer, tôi muốn tất cả lazy imports trong App.tsx được cập nhật tự động, để không phải sửa thủ công.

#### Acceptance Criteria

1. WHEN một page được di chuyển, THE Page_Reorganizer SHALL cập nhật lazy import statement trong `src/App.tsx`
2. THE Page_Reorganizer SHALL cập nhật import path từ `./pages/PageName` sang `./pages/(route-group)/PageName`
3. THE Page_Reorganizer SHALL giữ nguyên lazy loading pattern: `React.lazy(() => import(...))`
4. Round-trip property: WHEN build sau khi cập nhật imports, THE Page_Reorganizer SHALL đảm bảo không có import errors

### Requirement 17: Cập Nhật Import Statements trong Toàn Bộ Codebase

**User Story:** Là developer, tôi muốn tất cả imports của pages trong codebase được cập nhật tự động.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL tìm tất cả files import pages trong toàn bộ codebase (bao gồm `src/components/`, `src/hooks/`, `src/contexts/`, `src/lib/`, etc.)
2. THE Page_Reorganizer SHALL cập nhật import paths từ `@/pages/PageName` sang `@/pages/(route-group)/PageName`
3. THE Page_Reorganizer SHALL cập nhật cả relative imports (ví dụ: `../pages/PageName` → `../pages/(route-group)/PageName`)
4. THE Page_Reorganizer SHALL cập nhật imports trong các file: `.ts`, `.tsx`, `.js`, `.jsx`

### Requirement 18: Giữ Nguyên Route Definitions

**User Story:** Là developer, tôi muốn đảm bảo tất cả URL routes vẫn hoạt động đúng sau refactoring.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL NOT thay đổi bất kỳ `path` prop nào trong `<Route>` components
2. THE Page_Reorganizer SHALL chỉ cập nhật `element` prop để trỏ đến import mới
3. Invariant property: `route.path` trước và sau refactoring SHALL giống hệt nhau
4. WHEN user truy cập bất kỳ URL nào, SHALL render đúng page như trước refactoring

### Requirement 19: Validation và Testing

**User Story:** Là developer, tôi muốn đảm bảo refactoring không gây breaking changes.

#### Acceptance Criteria

1. WHEN refactoring hoàn tất, THE Page_Reorganizer SHALL chạy TypeScript compiler để kiểm tra type errors
2. WHEN refactoring hoàn tất, THE Page_Reorganizer SHALL chạy build command (`npm run build` hoặc `vite build`)
3. IF build thành công, THE Page_Reorganizer SHALL xác nhận không có Breaking_Change
4. THE Page_Reorganizer SHALL kiểm tra không còn imports trỏ đến old paths
5. Idempotence property: Chạy refactoring hai lần SHALL cho kết quả giống nhau (không tạo duplicate folders hoặc files)

### Requirement 20: Preserve Code Logic

**User Story:** Là developer, tôi muốn đảm bảo logic code bên trong pages không bị thay đổi.

#### Acceptance Criteria

1. THE Page_Reorganizer SHALL NOT thay đổi nội dung bên trong các page files
2. THE Page_Reorganizer SHALL NOT rename page files
3. THE Page_Reorganizer SHALL NOT thay đổi page exports (default vs named)
4. THE Page_Reorganizer SHALL NOT thay đổi component props hoặc hooks usage
5. THE Page_Reorganizer SHALL chỉ thay đổi file location và import paths

### Requirement 21: Tạo Index Files (Optional)

**User Story:** Là developer, tôi muốn có index files để import nhiều pages từ cùng một Route_Group dễ dàng hơn (nếu cần).

#### Acceptance Criteria

1. WHERE developer chọn tạo index files, THE Page_Reorganizer SHALL tạo `index.ts` trong mỗi Route_Group
2. WHERE index.ts được tạo, THE index.ts SHALL re-export tất cả pages trong Route_Group đó
3. WHERE index.ts được tạo, THE index.ts SHALL sử dụng named exports (không dùng `export * from`)
4. WHERE index.ts được tạo, THE index.ts SHALL giữ nguyên tên export của page gốc

---

## Dependencies & Constraints

- Sử dụng `git mv` thay vì `mv` để preserve git history
- TypeScript strict mode phải được maintain
- Build tool: Vite với path alias `@/` trỏ đến `src/`
- React Router v6 với lazy loading pattern
- KHÔNG thay đổi URL routes (path props trong Route components)
- KHÔNG rename files hoặc thay đổi page logic
- KHÔNG thay đổi export patterns (default exports)
- Phải test build thành công trước khi commit
- Cần scan toàn bộ codebase để tìm imports (bao gồm cả `src/components/`, `src/hooks/`, `src/contexts/`, `src/lib/`, etc.)
- Naming convention: `(folder-name)` với dấu ngoặc đơn để indicate route groups

---

## Out of Scope

- Refactoring logic bên trong pages
- Thay đổi page APIs hoặc props
- Tối ưu hóa performance
- Thêm tests mới
- Thay đổi routing logic hoặc URL structure
- Thay đổi naming conventions của files
- Refactoring các subfolders đã tồn tại (student/, teacher/ content)
- Thêm route guards hoặc authentication logic
