-- ═══════════════════════════════════════════════════════════════
-- 00 - FULL RESET & EXTENSIONS
-- ═══════════════════════════════════════════════════════════════

-- Xóa sạch schema cũ để tránh xung đột dữ liệu rác
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Cấp quyền
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- Cài đặt các tiện ích cần thiết
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Tạo UUID v4
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Tìm kiếm tiếng Nhật/Việt mượt hơn
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- Bỏ dấu tiếng Việt

-- Định nghĩa các vai trò trong hệ thống
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'user');
    END IF;
END $$;
