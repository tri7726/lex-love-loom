# Requirements Document

## Introduction

Phase 4 của refactoring tập trung vào việc tổ chức lại cấu trúc thư mục `src/data/` để cải thiện khả năng bảo trì và tìm kiếm. Hiện tại có 8 data files nằm rời ở root level của `src/data/`, gây khó khăn trong việc quản lý và tìm kiếm theo loại content. Mục tiêu là nhóm các files này vào các subfolder theo content types (learning content, configuration, assets), đồng thời đảm bảo không có breaking changes và preserve git history.

Refactoring này là bước thứ tư trong chuỗi cải tiến codebase, sau khi đã hoàn thành reorganize components, pages, và hooks.

---

## Glossary

- **Data_Reorganizer**: Hệ thống thực hiện việc di chuyển data files và cập nhật imports
- **Loose_File**: Data file nằm trực tiếp ở `src/data/` root level (không trong subfolder)
- **Import_Path**: Đường dẫn import trong TypeScript/JavaScript (ví dụ: `@/data/grammar-db`)
- **Git_History**: Lịch sử commit của file trong Git repository
- **Breaking_Change**: Thay đổi gây lỗi build hoặc runtime
- **Content_Type**: Loại data được nhóm (learning content, configuration, assets)
- **Learning_Content**: Data files chứa nội dung học tập (grammar, kanji, minna)
- **Configuration_Data**: Data files chứa cấu hình ứng dụng (collections, pet config/recipes)
- **Asset_Data**: Data files chứa tài nguyên tĩnh (stroke order)

---

## Requirements

### Requirement 1: Tạo Cấu Trúc Subfolder Mới

**User Story:** Là developer, tôi muốn các data files được nhóm theo content types rõ ràng, để tôi có thể tìm và maintain chúng dễ dàng hơn.

#### Acceptance Criteria

1. THE Data_Reorganizer SHALL tạo 3 subfolders mới trong `src/data/`: `content/`, `config/`, `assets/`
2. THE Data_Reorganizer SHALL giữ nguyên subfolder `dict/` đã tồn tại
3. WHEN tất cả files được di chuyển, `src/data/` root level SHALL chỉ chứa subfolders, không còn loose files
4. THE Data_Reorganizer SHALL tạo `index.ts` cho mỗi subfolder mới để re-export các data modules

### Requirement 2: Di Chuyển Learning Content Data

**User Story:** Là developer, tôi muốn các learning content data được nhóm vào một folder, để dễ quản lý nội dung học tập.

#### Acceptance Criteria

1. THE Data_Reorganizer SHALL di chuyển `grammar-db.ts` vào `src/data/content/`
2. THE Data_Reorganizer SHALL di chuyển `kanji-db.ts` vào `src/data/content/`
3. THE Data_Reorganizer SHALL di chuyển `minna-n4.ts` vào `src/data/content/`
4. THE Data_Reorganizer SHALL di chuyển `minna-n5.ts` vào `src/data/content/`
5. WHEN di chuyển, THE Data_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 3: Di Chuyển Configuration Data

**User Story:** Là developer, tôi muốn các configuration data được nhóm riêng, để dễ quản lý app settings và configs.

#### Acceptance Criteria

1. THE Data_Reorganizer SHALL di chuyển `custom-collections.ts` vào `src/data/config/`
2. THE Data_Reorganizer SHALL di chuyển `pet-config.ts` vào `src/data/config/`
3. THE Data_Reorganizer SHALL di chuyển `pet-recipes.ts` vào `src/data/config/`
4. WHEN di chuyển, THE Data_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 4: Di Chuyển Asset Data

**User Story:** Là developer, tôi muốn các asset data được nhóm riêng, để dễ quản lý static resources.

#### Acceptance Criteria

1. THE Data_Reorganizer SHALL di chuyển `strokeOrder.ts` vào `src/data/assets/`
2. WHEN di chuyển, THE Data_Reorganizer SHALL sử dụng `git mv` để preserve Git_History

### Requirement 5: Cập Nhật Import Statements

**User Story:** Là developer, tôi muốn tất cả imports được cập nhật tự động, để không phải sửa thủ công từng file.

#### Acceptance Criteria

1. WHEN một data file được di chuyển, THE Data_Reorganizer SHALL tìm tất cả files import data file đó trong toàn bộ codebase
2. THE Data_Reorganizer SHALL cập nhật Import_Path từ `@/data/filename` sang `@/data/subfolder/filename`
3. THE Data_Reorganizer SHALL cập nhật cả relative imports (ví dụ: `../data/filename` → `../data/subfolder/filename`)
4. THE Data_Reorganizer SHALL cập nhật imports trong các file: `.ts`, `.tsx`, `.js`, `.jsx`
5. Round-trip property: WHEN build sau khi cập nhật imports, THE Data_Reorganizer SHALL đảm bảo không có import errors

### Requirement 6: Tạo Index Files

**User Story:** Là developer, tôi muốn có index files để import nhiều data modules từ cùng một folder dễ dàng hơn.

#### Acceptance Criteria

1. THE Data_Reorganizer SHALL tạo `index.ts` trong mỗi subfolder mới (`content/`, `config/`, `assets/`)
2. THE index.ts SHALL re-export tất cả data modules trong subfolder đó
3. THE index.ts SHALL sử dụng named exports để giữ nguyên tên export gốc
4. THE index.ts SHALL preserve export types (const, type, interface) của data modules gốc

### Requirement 7: Validation và Testing

**User Story:** Là developer, tôi muốn đảm bảo refactoring không gây breaking changes.

#### Acceptance Criteria

1. WHEN refactoring hoàn tất, THE Data_Reorganizer SHALL chạy TypeScript compiler để kiểm tra type errors
2. WHEN refactoring hoàn tất, THE Data_Reorganizer SHALL chạy build command (`npm run build` hoặc `vite build`)
3. IF build thành công, THE Data_Reorganizer SHALL xác nhận không có Breaking_Change
4. THE Data_Reorganizer SHALL kiểm tra không còn imports trỏ đến old paths
5. Idempotence property: Chạy refactoring hai lần SHALL cho kết quả giống nhau (không tạo duplicate folders hoặc files)

### Requirement 8: Preserve Data Integrity

**User Story:** Là developer, tôi muốn đảm bảo data content và structure không bị thay đổi.

#### Acceptance Criteria

1. THE Data_Reorganizer SHALL NOT thay đổi nội dung data bên trong các files
2. THE Data_Reorganizer SHALL NOT rename data files
3. THE Data_Reorganizer SHALL NOT thay đổi data structure hoặc exports
4. THE Data_Reorganizer SHALL chỉ thay đổi file location và import paths
5. Invariant property: Data exports trước và sau refactoring SHALL có cùng type signature và values

### Requirement 9: Comprehensive Import Scanning

**User Story:** Là developer, tôi muốn đảm bảo tất cả imports trong toàn bộ codebase được tìm và cập nhật.

#### Acceptance Criteria

1. THE Data_Reorganizer SHALL scan imports trong `src/components/` và tất cả subfolders
2. THE Data_Reorganizer SHALL scan imports trong `src/pages/` và tất cả subfolders
3. THE Data_Reorganizer SHALL scan imports trong `src/hooks/` và tất cả subfolders
4. THE Data_Reorganizer SHALL scan imports trong `src/contexts/`, `src/utils/`, `src/lib/`, `src/types/`
5. THE Data_Reorganizer SHALL scan imports trong root level `src/` files (App.tsx, main.tsx, etc.)
6. THE Data_Reorganizer SHALL report số lượng files được cập nhật cho mỗi data file được di chuyển

---

## Dependencies & Constraints

- Sử dụng `git mv` thay vì `mv` để preserve git history
- TypeScript strict mode phải được maintain
- Build tool: Vite với path alias `@/` trỏ đến `src/`
- Không thay đổi subfolder `dict/` đã tồn tại
- Không rename files hoặc thay đổi data content
- Không thay đổi data structure, exports, hoặc type definitions
- Phải test build thành công trước khi commit
- Cần scan toàn bộ codebase để tìm imports (bao gồm cả components, pages, hooks, contexts, utils, lib, types)

---

## Out of Scope

- Refactoring data structure hoặc content bên trong files
- Thay đổi data APIs hoặc exports
- Tối ưu hóa data loading performance
- Thêm data validation hoặc tests mới
- Refactoring subfolder `dict/` đã tồn tại
- Thay đổi naming conventions của data files
- Migration hoặc transformation của data values

