-- =====================================================
-- Phase 9: Content Tables for Unified AI Hub
-- =====================================================

-- 1. Speaking Lessons (Shadowing)
CREATE TABLE IF NOT EXISTS speaking_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  level TEXT DEFAULT 'N5',
  category TEXT DEFAULT 'daily', -- 'travel', 'business', 'academic'
  sentences JSONB NOT NULL, -- Array of {id, japanese, reading, vietnamese, difficulty}
  icon TEXT DEFAULT 'Sparkles',
  color TEXT DEFAULT 'bg-emerald-500',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Roleplay Scenarios
CREATE TABLE IF NOT EXISTS roleplay_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'MapPin',
  image_url TEXT,
  persona TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  first_message TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Easy',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Speaking Lessons (Shadowing)
INSERT INTO speaking_lessons (title, level, category, sentences, icon, color) VALUES
  ('Chào hỏi hàng ngày', 'N5', 'daily', '[
    {"id": "1", "japanese": "おはようございます", "reading": "おはようございます", "vietnamese": "Chào buổi sáng", "difficulty": "easy"},
    {"id": "2", "japanese": "ありがとうございます", "reading": "ありがとうございます", "vietnamese": "Cảm ơn bạn", "difficulty": "easy"},
    {"id": "3", "japanese": "よろしくお願いします", "reading": "よろしくおねがいします", "vietnamese": "Rất vui được làm quen", "difficulty": "easy"}
  ]', 'Sparkles', 'bg-emerald-500'),
  ('Du lịch Nhật Bản', 'N4', 'travel', '[
    {"id": "t1", "japanese": "駅はどこですか", "reading": "えきはどこですか", "vietnamese": "Nhà ga ở đâu?", "difficulty": "medium"},
    {"id": "t2", "japanese": "おすすめの料理は何ですか", "reading": "おすすめのりょうりはなんですか", "vietnamese": "Món ăn gợi ý là gì?", "difficulty": "medium"}
  ]', 'Target', 'bg-blue-500'),
  ('Giao tiếp Công sở', 'N3', 'business', '[
    {"id": "b1", "japanese": "お疲れ様でした", "reading": "おつかれさまでした", "vietnamese": "Bạn đã vất vả rồi", "difficulty": "hard"},
    {"id": "b2", "japanese": "承知いたしました", "reading": "しょうちいたしました", "vietnamese": "Tôi đã hiểu rõ", "difficulty": "hard"}
  ]', 'MessageSquare', 'bg-amber-500');

-- Seed Initial Roleplay Scenarios
INSERT INTO roleplay_scenarios (title, description, icon, image_url, persona, system_prompt, first_message) VALUES
  ('Tại Sân Bay', 'Làm thủ tục check-in tại sân bay Narita.', 'Plane', 'https://images.unsplash.com/photo-1530132027412-2849f9114d2e?w=800', 'Nhân viên sân bay', 'Bạn là nhân viên check-in tại sân bay Narita. Hãy nói bằng tiếng Nhật lịch sự (Keigo).', 'いらっしゃいませ。パスポートをお願いします。'),
  ('Gọi Món Izakaya', 'Trải nghiệm quán nhậu Nhật Bản bản địa.', 'Utensils', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', 'Phục vụ quán', 'Bạn là phục vụ tại quán Izakaya. Hãy nói năng nhiệt tình, gợi ý món Sashimi.', 'いらっしゃいませ！お飲み物は何になさいますか？'),
  ('Phỏng vấn Công ty IT', 'Thử sức với buổi phỏng vấn xin việc.', 'Briefcase', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800', 'Người phỏng vấn', 'Bạn là HR Manager tại Rakuten. Hãy dùng kính ngữ chuẩn mực.', '本日はお越しいただきありがとうございます。自己紹介をお願いします。');

-- RLS
ALTER TABLE speaking_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE roleplay_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons" ON speaking_lessons FOR SELECT USING (true);
CREATE POLICY "Anyone can view scenarios" ON roleplay_scenarios FOR SELECT USING (true);
