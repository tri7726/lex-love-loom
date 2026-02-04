-- Tạo view public cho video_sources, loại bỏ trường created_by
CREATE VIEW public.video_sources_public
WITH (security_invoker=on) AS
  SELECT 
    id, 
    youtube_id, 
    title, 
    description, 
    duration, 
    thumbnail_url, 
    jlpt_level, 
    processed, 
    created_at, 
    updated_at
  FROM public.video_sources
  WHERE processed = true;

-- Cấp quyền SELECT trên view cho anon và authenticated
GRANT SELECT ON public.video_sources_public TO anon, authenticated;

-- Xóa policy SELECT cũ cho phép xem tất cả video đã xử lý
DROP POLICY IF EXISTS "Anyone can view processed videos" ON public.video_sources;

-- Tạo policy mới: chỉ cho phép creator xem video của họ (để update)
CREATE POLICY "Creators can view their own videos" 
ON public.video_sources 
FOR SELECT 
USING (auth.uid() = created_by);

-- Policy INSERT và UPDATE giữ nguyên để edge function và user vẫn hoạt động