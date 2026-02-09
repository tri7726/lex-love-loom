-- =====================================================
-- Sample N5 Kanji Data
-- =====================================================
-- This file inserts sample kanji data for testing
-- Includes: Numbers 1-10, basic kanji, relationships, and vocabulary
-- =====================================================

-- Insert Radicals first
INSERT INTO radicals (radical, name, meaning_vi, meaning_en, stroke_count, position) VALUES
('一', 'ichi', 'Một', 'One', 1, 'any'),
('二', 'ni', 'Hai', 'Two', 2, 'any'),
('人', 'hito', 'Người', 'Person', 2, 'left'),
('日', 'hi', 'Mặt trời, Ngày', 'Sun, Day', 4, 'any'),
('月', 'tsuki', 'Mặt trăng, Tháng', 'Moon, Month', 4, 'left'),
('木', 'ki', 'Cây', 'Tree', 4, 'any'),
('水', 'mizu', 'Nước', 'Water', 4, 'left'),
('火', 'hi', 'Lửa', 'Fire', 4, 'bottom'),
('土', 'tsuchi', 'Đất', 'Earth', 3, 'bottom'),
('口', 'kuchi', 'Miệng', 'Mouth', 3, 'enclosure')
ON CONFLICT (radical) DO NOTHING;

-- Insert N5 Kanji (Numbers 1-10 + Basic Kanji)
INSERT INTO kanji (
    character, hanviet, meaning_vi, meaning_en, 
    jlpt_level, grade, frequency, stroke_count, radical,
    onyomi, kunyomi, components, conversion_rules
) VALUES
-- Numbers
('一', 'NHẤT', 'Một', 'One', 'N5', 1, 2, 1, '一',
 ARRAY['イチ', 'イツ'], ARRAY['ひと', 'ひと.つ'], ARRAY['一'],
 'Âm イチ dùng trong số đếm, âm イツ dùng trong từ cổ'),

('二', 'NHỊ', 'Hai', 'Two', 'N5', 1, 3, 2, '二',
 ARRAY['ニ', 'ジ'], ARRAY['ふた', 'ふた.つ'], ARRAY['二'],
 'Âm ニ phổ biến hơn, ジ xuất hiện trong vài từ (二十歳 - はたち)'),

('三', 'TAM', 'Ba', 'Three', 'N5', 1, 4, 3, '一',
 ARRAY['サン', 'ゾウ'], ARRAY['み', 'み.つ'], ARRAY['三'],
 'Âm サン là chính, ゾウ rất hiếm (三月 - み.つき)'),

('四', 'TỨ', 'Bốn', 'Four', 'N5', 1, 5, 5, '口',
 ARRAY['シ', 'ヨン'], ARRAY['よ', 'よ.つ', 'よっ.つ', 'よん'], ARRAY['四'],
 'Tránh dùng シ (giống 死 - chết), thường dùng よん'),

('五', 'NGŨ', 'Năm', 'Five', 'N5', 1, 6, 4, '二',
 ARRAY['ゴ'], ARRAY['いつ', 'いつ.つ'], ARRAY['五'],
 'Kun: いつ.つ (năm cái), On: ゴ (ngũ)'),

('六', 'LỤC', 'Sáu', 'Six', 'N5', 1, 7, 4, '八',
 ARRAY['ロク', 'リク'], ARRAY['む', 'む.つ', 'むっ.つ', 'むい'], ARRAY['六'],
 'Âm ロク phổ biến, リク trong từ Hán Việt (六法 - りっぽう)'),

('七', 'THẤT', 'Bảy', 'Seven', 'N5', 1, 8, 2, '一',
 ARRAY['シチ', 'ナナ'], ARRAY['なな', 'なな.つ', 'なの'], ARRAY['七'],
 'Thường dùng なな để tránh nhầm với いち/よん'),

('八', 'BÁT', 'Tám', 'Eight', 'N5', 1, 9, 2, '八',
 ARRAY['ハチ', 'ハツ'], ARRAY['や', 'や.つ', 'やっ.つ', 'よう'], ARRAY['八'],
 'Âm ハチ phổ biến, ハツ trong một số từ (八百 - はっぴゃく)'),

('九', 'CỬU', 'Chín', 'Nine', 'N5', 1, 10, 2, '乙',
 ARRAY['キュウ', 'ク'], ARRAY['ここの', 'ここの.つ'], ARRAY['九'],
 'Cả hai âm phổ biến: きゅう và く'),

('十', 'THẬP', 'Mười', 'Ten', 'N5', 1, 11, 2, '十',
 ARRAY['ジュウ', 'ジッ', 'ジュッ'], ARRAY['とお', 'と'], ARRAY['十'],
 'ジュウ phổ biến, ジッ/ジュッ khi kết hợp (十歳 - じっさい)'),

-- Basic Kanji
('日', 'NHẬT', 'Ngày, Mặt trời, Nhật Bản', 'Day, Sun, Japan', 'N5', 1, 1, 4, '日',
 ARRAY['ニチ', 'ジツ'], ARRAY['ひ', 'か'], ARRAY['日'],
 'ニチ trong ngày tháng (月曜日), ジツ trong từ Hán (日光), ひ (mặt trời), か (ngày)'),

('月', 'NGUYỆT', 'Tháng, Mặt trăng', 'Month, Moon', 'N5', 1, 12, 4, '月',
 ARRAY['ゲツ', 'ガツ'], ARRAY['つき'], ARRAY['月'],
 'ゲツ trong thứ (月曜日), ガツ trong tháng (一月), つき (mặt trăng)'),

('火', 'HỎA', 'Lửa, Hỏa', 'Fire', 'N5', 1, 25, 4, '火',
 ARRAY['カ'], ARRAY['ひ', 'ほ'], ARRAY['火'],
 'カ trong ngày (火曜日), ひ (lửa), ほ trong từ ghép (火影)'),

('水', 'THỦY', 'Nước', 'Water', 'N5', 1, 15, 4, '水',
 ARRAY['スイ'], ARRAY['みず'], ARRAY['水'],
 'スイ trong ngày (水曜日), みず(nước)'),

('木', 'MỘC', 'Cây, Gỗ', 'Tree, Wood', 'N5', 1, 20, 4, '木',
 ARRAY['ボク', 'モク'], ARRAY['き', 'こ'], ARRAY['木'],
 'モク trong ngày (木曜日), ボク trong từ Hán (木馬), き (cây)'),

('金', 'KIM', 'Vàng, Kim loại, Tiền', 'Gold, Metal, Money', 'N5', 1, 18, 8, '金',
 ARRAY['キン', 'コン'], ARRAY['かね', 'かな'], ARRAY['金'],
 'キン trong ngày (金曜日) và vàng, かね (tiền, kim loại)'),

('土', 'THỔ', 'Đất', 'Earth, Soil', 'N5', 1, 30, 3, '土',
 ARRAY['ド', 'ト'], ARRAY['つち'], ARRAY['土'],
 'ド trong ngày (土曜日), つち (đất)'),

('人', 'NHÂN', 'Người', 'Person', 'N5', 1, 5, 2, '人',
 ARRAY['ジン', 'ニン'], ARRAY['ひと'], ARRAY['人'],
 'ジン trong từ Hán (日本人), ひと (người)'),

('本', 'BẢN', 'Sách, Gốc, Bản', 'Book, Origin', 'N5', 1, 10, 5, '木',
 ARRAY['ホン'], ARRAY['もと'], ARRAY['木','一'], 
 'ホン (sách, đếm vật dài), もと (gốc, nguồn gốc)'),

('山', 'SAN', 'Núi', 'Mountain', 'N5', 1, 24, 3, '山',
 ARRAY['サン', 'セン'], ARRAY['やま'], ARRAY['山'],
 'サン trong tên núi (富士山), やま (núi)'),

('川', 'XUYÊN', 'Sông', 'River', 'N5', 1, 28, 3, '川',
 ARRAY['セン'], ARRAY['かわ'], ARRAY['川'],
 'セン trong tên sông, かわ (sông)')

ON CONFLICT (character) DO NOTHING;

-- Insert Kanji Relationships
INSERT INTO kanji_relationships (kanji_id, related_kanji_id, relationship_type, strength, reason)
SELECT 
    k1.id, k2.id, 'meaning', 0.95, 'Sequential numbers'
FROM kanji k1, kanji k2
WHERE k1.character = '一' AND k2.character = '二'
UNION ALL
SELECT 
    k1.id, k2.id, 'meaning', 0.9, 'Sequential numbers'
FROM kanji k1, kanji k2
WHERE k1.character = '二' AND k2.character = '三'
UNION ALL
SELECT 
    k1.id, k2.id, 'component', 0.8, 'Uses 木 as component'
FROM kanji k1, kanji k2
WHERE k1.character = '木' AND k2.character = '本'
ON CONFLICT DO NOTHING;

-- Insert Vocabulary
INSERT INTO kanji_vocabulary (word, reading, hanviet, meaning_vi, meaning_en, jlpt_level, part_of_speech, example_sentence, example_translation) VALUES
-- 一 vocabulary
('一つ', 'ひとつ', 'NHẤT', 'Một cái', 'One thing', 'N5', 'Counter', 'りんごを一つください。', 'Cho tôi một quả táo.'),
('一人', 'ひとり', 'NHẤT NHÂN', 'Một người', 'One person', 'N5', 'Noun', '一人で行きます。', 'Tôi đi một mình.'),
('一番', 'いちばん', 'NHẤT PHIÊN', 'Nhất, Đầu tiên', 'Number one, First', 'N5', 'Adverb', 'コーヒーが一番好きです。', 'Tôi thích cà phê nhất.'),
('一月', 'いちがつ', 'NHẤT NGUYỆT', 'Tháng Một', 'January', 'N5', 'Noun', '一月に日本に行きます。', 'Tôi sẽ đi Nhật vào tháng Một.'),
('一日', 'ついたち', 'NHẤT NHẬT', 'Ngày mồng một', 'First day of month', 'N5', 'Noun', '今日は一日です。', 'Hôm nay là ngày mồng một.'),
('一緒', 'いっしょ', 'NHẤT TỸ', 'Cùng nhau', 'Together', 'N5', 'Adverb', '一緒に行きましょう。', 'Chúng ta cùng đi nhé.'),

-- 二 vocabulary
('二つ', 'ふたつ', 'NHỊ', 'Hai cái', 'Two things', 'N5', 'Counter', '二つください。', 'Cho tôi hai cái.'),
('二人', 'ふたり', 'NHỊ NHÂN', 'Hai người', 'Two people', 'N5', 'Noun', '二人で食べます。', 'Hai người cùng ăn.'),

-- 日本 vocabulary
('日本', 'にほん', 'NHẬT BẢN', 'Nhật Bản', 'Japan', 'N5', 'Noun', '日本に住んでいます。', 'Tôi đang sống ở Nhật Bản.'),
('日本人', 'にほんじん', 'NHẬT BẢN NHÂN', 'Người Nhật', 'Japanese person', 'N5', 'Noun', '私は日本人です。', 'Tôi là người Nhật.'),
('今日', 'きょう', 'KIM NHẬT', 'Hôm nay', 'Today', 'N5', 'Noun', '今日は何曜日ですか。', 'Hôm nay là thứ mấy?'),
('毎日', 'まいにち', 'MỖI NHẬT', 'Mỗi ngày', 'Every day', 'N5', 'Noun', '毎日勉強します。', 'Tôi học mỗi ngày.')

ON CONFLICT (word, reading) DO NOTHING;

-- Link Kanji to Vocabulary
INSERT INTO kanji_vocab_junction (kanji_id, vocabulary_id, position)
SELECT k.id, v.id, 1
FROM kanji k, kanji_vocabulary v
WHERE k.character = '一' AND v.word IN ('一つ', '一人', '一番', '一月', '一日', '一緒')
UNION ALL
SELECT k.id, v.id, 1
FROM kanji k, kanji_vocabulary v
WHERE k.character = '二' AND v.word IN ('二つ', '二人')
UNION ALL
SELECT k.id, v.id, 1
FROM kanji k, kanji_vocabulary v
WHERE k.character = '日' AND v.word IN ('日本', '日本人', '今日', '毎日', '一日')
UNION ALL
SELECT k.id, v.id, 2
FROM kanji k, kanji_vocabulary v
WHERE k.character = '本' AND v.word IN ('日本', '日本人')
UNION ALL
SELECT k.id, v.id, 2
FROM kanji k, kanji_vocabulary v
WHERE k.character = '人' AND v.word IN ('一人', '二人', '日本人')
ON CONFLICT DO NOTHING;

-- Add Textbook Vocabulary Mappings
INSERT INTO textbook_vocabulary (vocabulary_id, textbook, lesson_number, page_number)
SELECT v.id, 'minna', 5, 42
FROM kanji_vocabulary v
WHERE v.word IN ('一つ', '二つ', '一人', '二人')
UNION ALL
SELECT v.id, 'minna', 3, 28
FROM kanji_vocabulary v
WHERE v.word IN ('日本', '日本人')
UNION ALL
SELECT v.id, 'genki', 8, 196
FROM kanji_vocabulary v
WHERE v.word = '一番'
ON CONFLICT DO NOTHING;

-- Completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Sample N5 kanji data inserted successfully!';
    RAISE NOTICE '📊 Inserted: 21 kanji, 14 vocabulary words, relationships, and textbook mappings';
END $$;
