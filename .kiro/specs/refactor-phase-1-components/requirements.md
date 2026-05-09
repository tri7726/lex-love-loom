# Requirements Document

## Introduction

Phase 1 của refactoring tập trung vào việc tổ chức lại cấu trúc thư mục `src/components/` để cải thiện khả năng bảo trì và tìm kiếm. Hiện tại có 21 component files nằm rời ở root level của `src/components/`, gây khó khăn trong việc quản lý và tìm kiếm. Mục tiêu là nhóm các files này vào các subfolder theo chức năng, đồng thời đảm bảo không có breaking changes và preserve git history.

Refactoring này là bước đầu tiên trong chuỗi cải tiến codebase, tạo nền tảng cho các phase tiếp theo.

---

## Glossary

- **Component_Reorganizer**: Hệ thống thực hiện việc di chuyển và cập nhật imports
- **Loose_File**: Component file nằm trực tiếp ở `src/components/` root level (không trong subfolder)
- **Import_Path**: Đường dẫn import trong TypeScript/JavaScript (ví dụ: `@/components/Navigation`)
- **Git_History**: Lịch sử commit của file trong Git repository
- **Breaking_Change**: Thay đổi gây lỗi build hoặc runtime
- **Subfolder_Group**: Nhóm components theo chức năng (common, forms, media, search, input, practice, writing, navigation, error, ai-assist)

---

## Requirements

### Requirement 1: Tạo Cấu Trúc Subfolder Mới

**User Story:** Là developer, tôi muốn các components được nhóm theo chức năng rõ ràng, để tôi có thể tìm và maintain chúng dễ dàng hơn.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL tạo 10 subfolders mới trong `src/components/`: `common/`, `forms/`, `media/`, `search/`, `input/`, `practice/`, `writing/`, `navigation/`, `error/`, `ai-assist/`
2. THE Component_Reorganizer SHALL giữ nguyên 21 subfolders đã tồn tại (AI/, analytics/, auth/, chat/, dashboard/, dictionary/, duel/, effects/, flashcards/, games/, grammar/, kanji/, layout/, lexicon/, pet/, pwa/, review/, skills/, ui/, video/, vocabulary/)
3. WHEN tất cả files được di chuyển, `src/components/` root level SHALL chỉ chứa subfolders, không còn loose files
4. THE Component_Reorganizer SHALL tạo `index.ts` cho mỗi subfolder mới để re-export các components

### Requirement 2: Di Chuyển Common Components

**User Story:** Là developer, tôi muốn các components dùng chung được nhóm vào một folder, để dễ tái sử dụng.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `ConfettiProvider.tsx` vào `src/components/common/`
2. THE Component_Reorganizer SHALL di chuyển `JapaneseText.tsx` vào `src/components/common/`
3. THE Component_Reorganizer SHALL di chuyển `Leaderboard.tsx` vào `src/components/common/`
4. THE Component_Reorganizer SHALL di chuyển `StreakBadge.tsx` vào `src/components/common/`
5. THE Component_Reorganizer SHALL di chuyển `StreakReminderBanner.tsx` vào `src/components/common/`
6. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 3: Di Chuyển Form Components

**User Story:** Là developer, tôi muốn các dialogs và forms được nhóm riêng, để dễ quản lý UI patterns.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `CreatePassageDialog.tsx` vào `src/components/forms/`
2. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 4: Di Chuyển Media Components

**User Story:** Là developer, tôi muốn các audio/video players được nhóm riêng, để dễ maintain media features.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `DictationPlayer.tsx` vào `src/components/media/`
2. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 5: Di Chuyển Search Components

**User Story:** Là developer, tôi muốn các search và lookup components được nhóm riêng, để dễ cải thiện search functionality.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `JishoSearch.tsx` vào `src/components/search/`
2. THE Component_Reorganizer SHALL di chuyển `KanjiSuggestions.tsx` vào `src/components/search/`
3. THE Component_Reorganizer SHALL di chuyển `WordLookupPanel.tsx` vào `src/components/search/`
4. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 6: Di Chuyển Input Components

**User Story:** Là developer, tôi muốn các input components được nhóm riêng, để dễ maintain input handling.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `KanaKeyboard.tsx` vào `src/components/input/`
2. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 7: Di Chuyển Practice Components

**User Story:** Là developer, tôi muốn các practice mode components được nhóm riêng, để dễ phát triển learning features.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `DailyPractice.tsx` vào `src/components/practice/`
2. THE Component_Reorganizer SHALL di chuyển `PronunciationAnalysis.tsx` vào `src/components/practice/`
3. THE Component_Reorganizer SHALL di chuyển `SpeakingPracticeMode.tsx` vào `src/components/practice/`
4. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 8: Di Chuyển Writing Components

**User Story:** Là developer, tôi muốn các writing/stroke components được nhóm riêng, để dễ maintain kanji writing features.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `KanjiStrokeOrder.tsx` vào `src/components/writing/`
2. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 9: Di Chuyển Navigation Components

**User Story:** Là developer, tôi muốn các navigation components được nhóm riêng, để dễ maintain routing và navigation.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `Navigation.tsx` vào `src/components/navigation/`
2. THE Component_Reorganizer SHALL di chuyển `NavLink.tsx` vào `src/components/navigation/`
3. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 10: Di Chuyển Error Boundary Components

**User Story:** Là developer, tôi muốn các error boundaries được nhóm riêng, để dễ maintain error handling.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `SectionErrorBoundary.tsx` vào `src/components/error/`
2. THE Component_Reorganizer SHALL di chuyển `StandardErrorBoundary.tsx` vào `src/components/error/`
3. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 11: Di Chuyển AI Assistant Components

**User Story:** Là developer, tôi muốn các AI assistant components được nhóm riêng, để dễ phát triển AI features.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `UnitAIAssistant.tsx` vào `src/components/ai-assist/`
2. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 12: Di Chuyển PWA Component

**User Story:** Là developer, tôi muốn PWA components được nhóm vào folder pwa đã có sẵn.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL di chuyển `InstallPrompt.tsx` vào `src/components/pwa/`
2. WHEN di chuyển, THE Component_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 13: Cập Nhật Import Statements

**User Story:** Là developer, tôi muốn tất cả imports được cập nhật tự động, để không phải sửa thủ công từng file.

#### Acceptance Criteria

1. WHEN một component được di chuyển, THE Component_Reorganizer SHALL tìm tất cả files import component đó trong toàn bộ codebase
2. THE Component_Reorganizer SHALL cập nhật Import_Path từ `@/components/ComponentName` sang `@/components/subfolder/ComponentName`
3. THE Component_Reorganizer SHALL cập nhật cả relative imports (ví dụ: `../ComponentName` → `../subfolder/ComponentName`)
4. THE Component_Reorganizer SHALL cập nhật imports trong các file: `.ts`, `.tsx`, `.js`, `.jsx`
5. Round-trip property: WHEN build sau khi cập nhật imports, THE Component_Reorganizer SHALL đảm bảo không có import errors

### Requirement 14: Tạo Index Files

**User Story:** Là developer, tôi muốn có index files để import nhiều components từ cùng một folder dễ dàng hơn.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL tạo `index.ts` trong mỗi subfolder mới
2. THE index.ts SHALL re-export tất cả components trong subfolder đó
3. THE index.ts SHALL sử dụng named exports (không dùng `export * from`)
4. THE index.ts SHALL giữ nguyên tên export của component gốc

### Requirement 15: Validation và Testing

**User Story:** Là developer, tôi muốn đảm bảo refactoring không gây breaking changes.

#### Acceptance Criteria

1. WHEN refactoring hoàn tất, THE Component_Reorganizer SHALL chạy TypeScript compiler để kiểm tra type errors
2. WHEN refactoring hoàn tất, THE Component_Reorganizer SHALL chạy build command (`npm run build` hoặc `vite build`)
3. IF build thành công, THE Component_Reorganizer SHALL xác nhận không có Breaking_Change
4. THE Component_Reorganizer SHALL kiểm tra không còn imports trỏ đến old paths
5. Idempotence property: Chạy refactoring hai lần SHALL cho kết quả giống nhau (không tạo duplicate folders hoặc files)

### Requirement 16: Preserve Code Logic

**User Story:** Là developer, tôi muốn đảm bảo logic code bên trong components không bị thay đổi.

#### Acceptance Criteria

1. THE Component_Reorganizer SHALL NOT thay đổi nội dung bên trong các component files
2. THE Component_Reorganizer SHALL NOT rename component files
3. THE Component_Reorganizer SHALL NOT thay đổi component exports (default vs named)
4. THE Component_Reorganizer SHALL chỉ thay đổi file location và import paths

---

## Dependencies & Constraints

- Sử dụng `git mv` thay vì `mv` để preserve git history
- TypeScript strict mode phải được maintain
- Build tool: Vite với path alias `@/` trỏ đến `src/`
- Không thay đổi cấu trúc của 21 subfolders đã tồn tại
- Không rename files hoặc thay đổi component logic
- Phải test build thành công trước khi commit
- Cần scan toàn bộ codebase để tìm imports (bao gồm cả `src/pages/`, `src/hooks/`, `src/contexts/`, etc.)

---

## Out of Scope

- Refactoring logic bên trong components
- Thay đổi component APIs hoặc props
- Tối ưu hóa performance
- Thêm tests mới
- Refactoring các subfolders đã tồn tại (AI/, analytics/, etc.)
- Thay đổi naming conventions
