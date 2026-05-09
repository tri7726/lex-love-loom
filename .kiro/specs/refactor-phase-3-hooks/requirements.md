# Requirements Document

## Introduction

Phase 3 của refactoring tập trung vào việc tổ chức lại cấu trúc thư mục `src/hooks/` để cải thiện khả năng bảo trì và tìm kiếm. Hiện tại có 47 hook files nằm rời ở root level của `src/hooks/`, gây khó khăn trong việc quản lý và tìm kiếm. Mục tiêu là nhóm các files này vào các subfolder theo functional groups, đồng thời đảm bảo không có breaking changes và preserve git history.

Refactoring này là bước tiếp theo sau Phase 1 (components reorganization) và Phase 2 (pages reorganization), tiếp tục cải thiện cấu trúc codebase.

---

## Glossary

- **Hook_Reorganizer**: Hệ thống thực hiện việc di chuyển hooks và cập nhật imports
- **Loose_File**: Hook file nằm trực tiếp ở `src/hooks/` root level (không trong subfolder)
- **Import_Path**: Đường dẫn import trong TypeScript/JavaScript (ví dụ: `@/hooks/useAuth`)
- **Git_History**: Lịch sử commit của file trong Git repository
- **Breaking_Change**: Thay đổi gây lỗi build hoặc runtime
- **Functional_Group**: Nhóm hooks theo chức năng (core, learning, practice, gamification, pet, media, kanji, input, search, social, pwa, utils)

---

## Requirements

### Requirement 1: Tạo Cấu Trúc Subfolder Mới

**User Story:** Là developer, tôi muốn các hooks được nhóm theo chức năng rõ ràng, để tôi có thể tìm và maintain chúng dễ dàng hơn.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL tạo 12 subfolders mới trong `src/hooks/`: `core/`, `learning/`, `practice/`, `gamification/`, `pet/`, `media/`, `kanji/`, `input/`, `search/`, `social/`, `pwa/`, `utils/`
2. THE Hook_Reorganizer SHALL giữ nguyên subfolder `api/` đã tồn tại
3. WHEN tất cả files được di chuyển, `src/hooks/` root level SHALL chỉ chứa subfolders, không còn loose files
4. THE Hook_Reorganizer SHALL tạo `index.ts` cho mỗi subfolder mới để re-export các hooks

### Requirement 2: Di Chuyển Core Hooks

**User Story:** Là developer, tôi muốn các core hooks (auth, profile, theme, mobile) được nhóm riêng, để dễ quản lý core functionality.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển `useAuth.tsx` vào `src/hooks/core/`
2. THE Hook_Reorganizer SHALL di chuyển `useProfile.tsx` vào `src/hooks/core/`
3. THE Hook_Reorganizer SHALL di chuyển `useTheme.tsx` vào `src/hooks/core/`
4. THE Hook_Reorganizer SHALL di chuyển `use-mobile.tsx` vào `src/hooks/core/`
5. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 3: Di Chuyển Learning Hooks

**User Story:** Là developer, tôi muốn các learning content hooks được nhóm riêng, để dễ phát triển learning features.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển 10 files vào `src/hooks/learning/`: `useFlashcardCreation.ts`, `useFlashcardFolders.ts`, `useGrammarMastery.ts`, `useInterleavedSession.ts`, `useLearningDiagnostics.ts`, `useLearningPath.ts`, `useSRS.ts`, `useFSRS.ts`, `useVocabulary.ts`, `useDynamicDifficulty.ts`
2. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 4: Di Chuyển Practice Hooks

**User Story:** Là developer, tôi muốn các practice và review hooks được nhóm riêng, để dễ maintain practice features.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển `useSentenceBookmark.ts` vào `src/hooks/practice/`
2. THE Hook_Reorganizer SHALL di chuyển `useWordHistory.ts` vào `src/hooks/practice/`
3. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 5: Di Chuyển Gamification Hooks

**User Story:** Là developer, tôi muốn các gamification hooks được nhóm riêng, để dễ maintain game mechanics.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển 7 files vào `src/hooks/gamification/`: `useAchievementAnimation.ts`, `useAchievements.ts`, `useConfetti.ts`, `useDuelChannel.ts`, `useEvolvedSkills.ts`, `useStreakReminder.ts`, `useXP.ts`
2. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 6: Di Chuyển Pet System Hooks

**User Story:** Là developer, tôi muốn các pet system hooks được nhóm riêng, để dễ maintain pet features.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển `usePet.ts` vào `src/hooks/pet/`
2. THE Hook_Reorganizer SHALL di chuyển `usePetAdventure.ts` vào `src/hooks/pet/`
3. THE Hook_Reorganizer SHALL di chuyển `usePetCodex.ts` vào `src/hooks/pet/`
4. THE Hook_Reorganizer SHALL di chuyển `usePetShop.ts` vào `src/hooks/pet/`
5. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 7: Di Chuyển Media Hooks

**User Story:** Là developer, tôi muốn các audio/video/speech hooks được nhóm riêng, để dễ maintain media features.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển 8 files vào `src/hooks/media/`: `useAudio.ts`, `useAudioRecorder.ts`, `useBrushSound.ts`, `useSpeechRecognition.ts`, `useSpeechToText.ts`, `useTTS.ts`, `useYouTubePlayer.ts`, `useZenSpeech.ts`
2. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 8: Di Chuyển Kanji Hooks

**User Story:** Là developer, tôi muốn các kanji-related hooks được nhóm riêng, để dễ maintain kanji features.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển `useKanjiDetails.ts` vào `src/hooks/kanji/`
2. THE Hook_Reorganizer SHALL di chuyển `useKanjiLookup.ts` vào `src/hooks/kanji/`
3. THE Hook_Reorganizer SHALL di chuyển `useKanjiSearch.ts` vào `src/hooks/kanji/`
4. THE Hook_Reorganizer SHALL di chuyển `useRelatedKanji.ts` vào `src/hooks/kanji/`
5. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 9: Di Chuyển Input Hook

**User Story:** Là developer, tôi muốn input hooks được nhóm riêng, để dễ maintain input handling.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển `useKanaInput.ts` vào `src/hooks/input/`
2. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 10: Di Chuyển Search Hook

**User Story:** Là developer, tôi muốn search hooks được nhóm riêng, để dễ maintain search functionality.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển `useWordLookup.ts` vào `src/hooks/search/`
2. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 11: Di Chuyển Social Hook

**User Story:** Là developer, tôi muốn social hooks được nhóm riêng, để dễ maintain social features.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển `useFriends.ts` vào `src/hooks/social/`
2. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 12: Di Chuyển PWA Hook

**User Story:** Là developer, tôi muốn PWA hooks được nhóm riêng, để dễ maintain offline functionality.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển `useOfflineQueue.ts` vào `src/hooks/pwa/`
2. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 13: Di Chuyển Utility Hooks

**User Story:** Là developer, tôi muốn các utility hooks được nhóm riêng, để dễ tái sử dụng.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL di chuyển 5 files vào `src/hooks/utils/`: `use-toast.ts`, `useCooldown.ts`, `useDebounce.ts`, `useThrottle.ts`, `useTimer.ts`
2. WHEN di chuyển, THE Hook_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 14: Cập Nhật Import Statements

**User Story:** Là developer, tôi muốn tất cả imports được cập nhật tự động, để không phải sửa thủ công từng file.

#### Acceptance Criteria

1. WHEN một hook được di chuyển, THE Hook_Reorganizer SHALL tìm tất cả files import hook đó trong toàn bộ codebase
2. THE Hook_Reorganizer SHALL cập nhật Import_Path từ `@/hooks/hookName` sang `@/hooks/subfolder/hookName`
3. THE Hook_Reorganizer SHALL cập nhật cả relative imports (ví dụ: `../hooks/hookName` → `../hooks/subfolder/hookName`)
4. THE Hook_Reorganizer SHALL cập nhật imports trong các file: `.ts`, `.tsx`, `.js`, `.jsx`
5. THE Hook_Reorganizer SHALL scan các thư mục: `src/pages/`, `src/components/`, `src/contexts/`, `src/lib/`, `src/hooks/` (cross-hook imports)
6. Round-trip property: WHEN build sau khi cập nhật imports, THE Hook_Reorganizer SHALL đảm bảo không có import errors

### Requirement 15: Tạo Index Files

**User Story:** Là developer, tôi muốn có index files để import nhiều hooks từ cùng một folder dễ dàng hơn.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL tạo `index.ts` trong mỗi subfolder mới
2. THE index.ts SHALL re-export tất cả hooks trong subfolder đó
3. THE index.ts SHALL sử dụng named exports (không dùng `export * from`)
4. THE index.ts SHALL giữ nguyên tên export của hook gốc
5. THE index.ts SHALL support tree-shaking (không bundle unused hooks)

### Requirement 16: Validation và Testing

**User Story:** Là developer, tôi muốn đảm bảo refactoring không gây breaking changes.

#### Acceptance Criteria

1. WHEN refactoring hoàn tất, THE Hook_Reorganizer SHALL chạy TypeScript compiler để kiểm tra type errors
2. WHEN refactoring hoàn tất, THE Hook_Reorganizer SHALL chạy build command (`npm run build` hoặc `vite build`)
3. IF build thành công, THE Hook_Reorganizer SHALL xác nhận không có Breaking_Change
4. THE Hook_Reorganizer SHALL kiểm tra không còn imports trỏ đến old paths
5. Idempotence property: Chạy refactoring hai lần SHALL cho kết quả giống nhau (không tạo duplicate folders hoặc files)

### Requirement 17: Preserve Code Logic

**User Story:** Là developer, tôi muốn đảm bảo logic code bên trong hooks không bị thay đổi.

#### Acceptance Criteria

1. THE Hook_Reorganizer SHALL NOT thay đổi nội dung bên trong các hook files
2. THE Hook_Reorganizer SHALL NOT rename hook files
3. THE Hook_Reorganizer SHALL NOT thay đổi hook exports (default vs named)
4. THE Hook_Reorganizer SHALL NOT thay đổi hook APIs hoặc parameters
5. THE Hook_Reorganizer SHALL chỉ thay đổi file location và import paths

---

## Dependencies & Constraints

- Sử dụng `git mv` thay vì `mv` để preserve git history
- TypeScript strict mode phải được maintain
- Build tool: Vite với path alias `@/` trỏ đến `src/`
- Không thay đổi cấu trúc của subfolder `api/` đã tồn tại
- Không rename files hoặc thay đổi hook logic
- Phải test build thành công trước khi commit
- Cần scan toàn bộ codebase để tìm imports (bao gồm cả `src/pages/`, `src/components/`, `src/hooks/`, `src/contexts/`, `src/lib/`, etc.)
- Hooks có thể import lẫn nhau (cross-hook dependencies) nên cần cẩn thận khi cập nhật imports

---

## Out of Scope

- Refactoring logic bên trong hooks
- Thay đổi hook APIs hoặc parameters
- Tối ưu hóa performance
- Thêm tests mới
- Refactoring subfolder `api/` đã tồn tại
- Thay đổi naming conventions
- Tạo custom hooks mới
- Thay đổi hook dependencies hoặc React version requirements
