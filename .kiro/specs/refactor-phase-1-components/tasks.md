# Implementation Plan: Phase 1 — Reorganize Components

## Overview

Tổ chức lại cấu trúc thư mục `src/components/` bằng cách di chuyển 21 component files từ root level vào 10 subfolders theo chức năng. Sử dụng `git mv` để preserve history, cập nhật tất cả imports tự động, và validate không có breaking changes.

## Tasks

- [x] 1. Group 1: Setup và Create Folders

  - [x] 1.1 Tạo cấu trúc subfolder mới
    - Chạy `mkdir -p src/components/{common,forms,media,search,input,practice,writing,navigation,error,ai-assist}` để tạo 10 subfolders mới
    - Verify tất cả folders được tạo thành công
    - Verify 21 subfolders đã tồn tại không bị ảnh hưởng (AI/, analytics/, auth/, chat/, dashboard/, dictionary/, duel/, effects/, flashcards/, games/, grammar/, kanji/, layout/, lexicon/, pet/, pwa/, review/, skills/, ui/, video/, vocabulary/)
    - _Requirements: 1.1, 1.2_

- [ ] 2. Checkpoint — Folder Structure
  - Đảm bảo tất cả 10 folders mới được tạo, không có lỗi file system. Hỏi user nếu có thắc mắc.

- [x] 3. Group 2: Di Chuyển Common Components

  - [x] 3.1 Di chuyển 5 common components vào `src/components/common/`
    - Chạy `git mv src/components/ConfettiProvider.tsx src/components/common/`
    - Chạy `git mv src/components/JapaneseText.tsx src/components/common/`
    - Chạy `git mv src/components/Leaderboard.tsx src/components/common/`
    - Chạy `git mv src/components/StreakBadge.tsx src/components/common/`
    - Chạy `git mv src/components/StreakReminderBanner.tsx src/components/common/`
    - Verify files tồn tại ở vị trí mới và không còn ở vị trí cũ
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 Cập nhật imports cho common components
    - Tìm tất cả files import `ConfettiProvider`, `JapaneseText`, `Leaderboard`, `StreakBadge`, `StreakReminderBanner`
    - Cập nhật import paths từ `@/components/ComponentName` sang `@/components/common/ComponentName`
    - Scan các thư mục: `src/pages/`, `src/components/`, `src/hooks/`, `src/contexts/`, `src/lib/`, `src/integrations/`, `src/types/`, `src/*.tsx`
    - Verify không còn imports trỏ đến old paths bằng grep search
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ]* 3.3 Write property test cho git history preservation
    - **Property 2: Git History Preservation** — `git log --follow` cho mỗi file đã move phải hiển thị complete commit history
    - **Validates: Requirements 2.6**

- [ ] 4. Checkpoint — Common Components
  - Đảm bảo 5 common components đã move thành công, imports đã update, TypeScript compile không lỗi. Hỏi user nếu có thắc mắc.

- [x] 5. Group 3: Di Chuyển Form Components

  - [x] 5.1 Di chuyển form component vào `src/components/forms/`
    - Chạy `git mv src/components/CreatePassageDialog.tsx src/components/forms/`
    - Verify file tồn tại ở vị trí mới
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Cập nhật imports cho form components
    - Tìm tất cả files import `CreatePassageDialog`
    - Cập nhật import path từ `@/components/CreatePassageDialog` sang `@/components/forms/CreatePassageDialog`
    - Verify không còn imports trỏ đến old path
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 6. Group 4: Di Chuyển Media Components

  - [x] 6.1 Di chuyển media component vào `src/components/media/`
    - Chạy `git mv src/components/DictationPlayer.tsx src/components/media/`
    - Verify file tồn tại ở vị trí mới
    - _Requirements: 4.1, 4.2_

  - [x] 6.2 Cập nhật imports cho media components
    - Tìm tất cả files import `DictationPlayer`
    - Cập nhật import path từ `@/components/DictationPlayer` sang `@/components/media/DictationPlayer`
    - Verify không còn imports trỏ đến old path
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 7. Group 5: Di Chuyển Search Components

  - [x] 7.1 Di chuyển 3 search components vào `src/components/search/`
    - Chạy `git mv src/components/JishoSearch.tsx src/components/search/`
    - Chạy `git mv src/components/KanjiSuggestions.tsx src/components/search/`
    - Chạy `git mv src/components/WordLookupPanel.tsx src/components/search/`
    - Verify files tồn tại ở vị trí mới
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.2 Cập nhật imports cho search components
    - Tìm tất cả files import `JishoSearch`, `KanjiSuggestions`, `WordLookupPanel`
    - Cập nhật import paths từ `@/components/ComponentName` sang `@/components/search/ComponentName`
    - Verify không còn imports trỏ đến old paths
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 8. Checkpoint — Forms, Media, Search
  - Đảm bảo forms, media, search components đã move và imports đã update. TypeScript compile không lỗi. Hỏi user nếu có thắc mắc.

- [ ] 9. Group 6: Di Chuyển Input Components

  - [x] 9.1 Di chuyển input component vào `src/components/input/`
    - Chạy `git mv src/components/KanaKeyboard.tsx src/components/input/`
    - Verify file tồn tại ở vị trí mới
    - _Requirements: 6.1, 6.2_

  - [x] 9.2 Cập nhật imports cho input components
    - Tìm tất cả files import `KanaKeyboard`
    - Cập nhật import path từ `@/components/KanaKeyboard` sang `@/components/input/KanaKeyboard`
    - Verify không còn imports trỏ đến old path
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 10. Group 7: Di Chuyển Practice Components

  - [x] 10.1 Di chuyển 3 practice components vào `src/components/practice/`
    - Chạy `git mv src/components/DailyPractice.tsx src/components/practice/`
    - Chạy `git mv src/components/PronunciationAnalysis.tsx src/components/practice/`
    - Chạy `git mv src/components/SpeakingPracticeMode.tsx src/components/practice/`
    - Verify files tồn tại ở vị trí mới
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 10.2 Cập nhật imports cho practice components
    - Tìm tất cả files import `DailyPractice`, `PronunciationAnalysis`, `SpeakingPracticeMode`
    - Cập nhật import paths từ `@/components/ComponentName` sang `@/components/practice/ComponentName`
    - Verify không còn imports trỏ đến old paths
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 11. Group 8: Di Chuyển Writing Components

  - [x] 11.1 Di chuyển writing component vào `src/components/writing/`
    - Chạy `git mv src/components/KanjiStrokeOrder.tsx src/components/writing/`
    - Verify file tồn tại ở vị trí mới
    - _Requirements: 8.1, 8.2_

  - [x] 11.2 Cập nhật imports cho writing components
    - Tìm tất cả files import `KanjiStrokeOrder`
    - Cập nhật import path từ `@/components/KanjiStrokeOrder` sang `@/components/writing/KanjiStrokeOrder`
    - Verify không còn imports trỏ đến old path
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 12. Checkpoint — Input, Practice, Writing
  - Đảm bảo input, practice, writing components đã move và imports đã update. TypeScript compile không lỗi. Hỏi user nếu có thắc mắc.

- [ ] 13. Group 9: Di Chuyển Navigation Components

  - [x] 13.1 Di chuyển 2 navigation components vào `src/components/navigation/`
    - Chạy `git mv src/components/Navigation.tsx src/components/navigation/`
    - Chạy `git mv src/components/NavLink.tsx src/components/navigation/`
    - Verify files tồn tại ở vị trí mới
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 13.2 Cập nhật imports cho navigation components
    - Tìm tất cả files import `Navigation`, `NavLink`
    - Cập nhật import paths từ `@/components/ComponentName` sang `@/components/navigation/ComponentName`
    - Verify không còn imports trỏ đến old paths
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 14. Group 10: Di Chuyển Error Boundary Components

  - [x] 14.1 Di chuyển 2 error boundary components vào `src/components/error/`
    - Chạy `git mv src/components/SectionErrorBoundary.tsx src/components/error/`
    - Chạy `git mv src/components/StandardErrorBoundary.tsx src/components/error/`
    - Verify files tồn tại ở vị trí mới
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 14.2 Cập nhật imports cho error boundary components
    - Tìm tất cả files import `SectionErrorBoundary`, `StandardErrorBoundary`
    - Cập nhật import paths từ `@/components/ComponentName` sang `@/components/error/ComponentName`
    - Verify không còn imports trỏ đến old paths
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 15. Group 11: Di Chuyển AI Assistant Components

  - [x] 15.1 Di chuyển AI assistant component vào `src/components/ai-assist/`
    - Chạy `git mv src/components/UnitAIAssistant.tsx src/components/ai-assist/`
    - Verify file tồn tại ở vị trí mới
    - _Requirements: 11.1, 11.2_

  - [x] 15.2 Cập nhật imports cho AI assistant components
    - Tìm tất cả files import `UnitAIAssistant`
    - Cập nhật import path từ `@/components/UnitAIAssistant` sang `@/components/ai-assist/UnitAIAssistant`
    - Verify không còn imports trỏ đến old path
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 16. Group 12: Di Chuyển PWA Component

  - [x] 16.1 Di chuyển PWA component vào `src/components/pwa/` (existing folder)
    - Chạy `git mv src/components/InstallPrompt.tsx src/components/pwa/`
    - Verify file tồn tại ở vị trí mới
    - _Requirements: 12.1, 12.2_

  - [x] 16.2 Cập nhật imports cho PWA components
    - Tìm tất cả files import `InstallPrompt`
    - Cập nhật import path từ `@/components/InstallPrompt` sang `@/components/pwa/InstallPrompt`
    - Verify không còn imports trỏ đến old path
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 17. Checkpoint — Navigation, Error, AI, PWA
  - Đảm bảo navigation, error, ai-assist, pwa components đã move và imports đã update. TypeScript compile không lỗi. Hỏi user nếu có thắc mắc.

- [ ] 18. Group 13: Create Index Files

  - [x] 18.1 Tạo `src/components/common/index.ts`
    - Export tất cả 5 components: `ConfettiProvider`, `JapaneseText`, `Leaderboard`, `StreakBadge`, `StreakReminderBanner`
    - Sử dụng named exports: `export { ComponentName } from './ComponentName'`
    - Sắp xếp alphabetically
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.2 Tạo `src/components/forms/index.ts`
    - Export `CreatePassageDialog`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.3 Tạo `src/components/media/index.ts`
    - Export `DictationPlayer`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.4 Tạo `src/components/search/index.ts`
    - Export tất cả 3 components: `JishoSearch`, `KanjiSuggestions`, `WordLookupPanel`
    - Sắp xếp alphabetically
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.5 Tạo `src/components/input/index.ts`
    - Export `KanaKeyboard`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.6 Tạo `src/components/practice/index.ts`
    - Export tất cả 3 components: `DailyPractice`, `PronunciationAnalysis`, `SpeakingPracticeMode`
    - Sắp xếp alphabetically
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.7 Tạo `src/components/writing/index.ts`
    - Export `KanjiStrokeOrder`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.8 Tạo `src/components/navigation/index.ts`
    - Export tất cả 2 components: `Navigation`, `NavLink`
    - Sắp xếp alphabetically
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.9 Tạo `src/components/error/index.ts`
    - Export tất cả 2 components: `SectionErrorBoundary`, `StandardErrorBoundary`
    - Sắp xếp alphabetically
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.10 Tạo `src/components/ai-assist/index.ts`
    - Export `UnitAIAssistant`
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [x] 18.11 Cập nhật `src/components/pwa/index.ts` (existing file)
    - Thêm export cho `InstallPrompt` vào file index.ts đã có
    - Giữ nguyên các exports khác nếu có
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 19. Checkpoint — Index Files
  - Đảm bảo tất cả index files được tạo với đúng exports. TypeScript compile không lỗi. Hỏi user nếu có thắc mắc.

- [ ] 20. Group 14: Final Validation

  - [x] 20.1 Verify không còn loose files ở root
    - Chạy `ls src/components/*.tsx 2>/dev/null | wc -l` — kết quả phải là 0
    - Verify tất cả 21 component files đã được move vào subfolders
    - _Requirements: 1.3_

  - [x] 20.2 Verify không còn old import paths
    - Chạy grep search cho tất cả 21 component names với old import pattern
    - Pattern: `rg "from ['\"]@/components/(ConfettiProvider|CreatePassageDialog|DailyPractice|DictationPlayer|InstallPrompt|JapaneseText|JishoSearch|KanaKeyboard|KanjiStrokeOrder|KanjiSuggestions|Leaderboard|Navigation|NavLink|PronunciationAnalysis|SectionErrorBoundary|SpeakingPracticeMode|StandardErrorBoundary|StreakBadge|StreakReminderBanner|UnitAIAssistant|WordLookupPanel)['\"]" src/`
    - Kết quả phải không tìm thấy matches
    - _Requirements: 13.4_

  - [x] 20.3 Run TypeScript compiler check
    - Chạy `npx tsc --noEmit`
    - Verify không có type errors
    - _Requirements: 15.1_

  - [x] 20.4 Run build command
    - Chạy `npm run build` hoặc `vite build`
    - Verify build thành công không có errors
    - _Requirements: 15.2, 15.3_

  - [ ]* 20.5 Write property test cho component content invariant
    - **Property 6: Component Content Invariant** — File content phải byte-for-byte identical trước và sau move
    - **Validates: Requirements 16.1, 16.2, 16.3**

  - [ ]* 20.6 Write property test cho import path update completeness
    - **Property 3: Import Path Update Completeness** — Tất cả imports phải reference new path, không có imports reference old path
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4_

  - [ ]* 20.7 Write property test cho idempotence
    - **Property 7: Idempotence of Refactoring** — Chạy refactoring hai lần cho kết quả giống nhau
    - **Validates: Requirements 15.5**

- [ ] 21. Final Checkpoint — Đảm bảo tất cả tests pass
  - Đảm bảo tất cả validation checks pass, không có loose files, không có old imports, build thành công. Hỏi user nếu có thắc mắc.

- [ ] 22. Group 15: Commit Changes

  - [x] 22.1 Review changes và commit
    - Review tất cả changes với `git status` và `git diff --stat`
    - Commit với message: `refactor(components): reorganize components into functional subfolders`
    - Body: liệt kê 10 subfolders mới và số lượng components đã move
    - _Requirements: All_

## Notes

- Tasks đánh dấu `*` là optional (property tests), có thể bỏ qua để MVP nhanh hơn
- Mỗi task tham chiếu requirements cụ thể để traceability
- Checkpoints đảm bảo validate incremental sau mỗi nhóm components
- Sử dụng `git mv` thay vì `mv` để preserve git history
- Property tests validate correctness properties quan trọng (git history, import completeness, content invariance, idempotence)
- Scan imports trong các thư mục: `src/pages/`, `src/components/`, `src/hooks/`, `src/contexts/`, `src/lib/`, `src/integrations/`, `src/types/`, `src/*.tsx`
- Index files sử dụng named exports và sắp xếp alphabetically
