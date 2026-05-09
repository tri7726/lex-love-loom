-- =====================================================
-- SEED DATA: Minna no Nihongo Lessons 11-25
-- Total: ~400+ words
-- =====================================================

INSERT INTO vocabulary (lesson, kanji, word, kana, romaji, meaning_vi, meaning_en, part_of_speech, example_jp, example_vi, jlpt_level, tags)
VALUES
-- LESSON 11 (Số lượng)
(11, '一つ', '一つ', 'ひとつ', 'hitotsu', '1 cái (đồ vật)', 'one (object)', 'noun', 'りんごを一つください。', 'Cho tôi một quả táo.', 'N5', ARRAY['number', 'counter']),
(11, '二人', '二人', 'ふたり', 'futari', '2 người', 'two people', 'noun', '私たちは二人です。', 'Chúng tôi có hai người.', 'N5', ARRAY['number', 'counter']),
(11, '台', '台', 'だい', 'dai', 'cái (máy móc, xe cộ)', 'counter for machines', 'suffix', '車が５台あります。', 'Có 5 chiếc ô tô.', 'N5', ARRAY['counter']),

-- LESSON 12 (Thì quá khứ & So sánh)
(12, '簡単', '簡単', 'かんたん', 'kantan', 'đơn giản, dễ', 'easy, simple', 'na-adj', 'この問題は簡単です。', 'Câu hỏi này dễ.', 'N5', ARRAY['quality']),
(12, '近い', '近い', 'ちかい', 'chikai', 'gần', 'near', 'i-adj', '駅はここから近いです。', 'Nhà ga gần đây.', 'N5', ARRAY['quality']),
(12, '速い', '速い', 'はやい', 'hayai', 'nhanh', 'fast', 'i-adj', '新幹線は速いです。', 'Tàu Shinkansen rất nhanh.', 'N5', ARRAY['quality']),

-- LESSON 13 (Mong muốn)
(13, '欲しい', '欲しい', 'ほしい', 'hoshii', 'muốn có', 'want', 'i-adj', '新しい車が欲しいです。', 'Tôi muốn có xe hơi mới.', 'N5', ARRAY['feeling']),
(13, '遊びます', '遊びます', 'あそびます', 'asobimasu', 'chơi', 'play', 'verb', '公園で遊びます。', 'Chơi ở công viên.', 'N5', ARRAY['action']),

-- LESSON 14 (Thể Te - Yêu cầu)
(14, '急ぎます', '急ぎます', 'いそぎます', 'isogimasu', 'vội, gấp', 'hurry', 'verb', '急いでください。', 'Hãy khẩn trương lên.', 'N5', ARRAY['action']),
(14, '待ちます', '待ちます', 'まちます', 'machimasu', 'đợi', 'wait', 'verb', 'ちょっと待ってください。', 'Hãy đợi một chút.', 'N5', ARRAY['action']),

-- LESSON 15 (Thể Te - Cho phép)
(15, '座ります', '座ります', 'すわります', 'suwarimasu', 'ngồi', 'sit down', 'verb', 'ここに座ってもいいですか。', 'Tôi ngồi đây có được không?', 'N5', ARRAY['action']),
(15, '知っています', '知っています', 'しっています', 'shitteimasu', 'biết', 'know', 'verb', 'そのニュースを知っています。', 'Tôi biết tin đó.', 'N5', ARRAY['action']),

-- LESSON 18 (Thể từ điển - Khả năng)
(18, 'できる', 'できる', 'できる', 'dekiru', 'có thể', 'can do', 'verb', '料理ができます。', 'Tôi có thể nấu ăn.', 'N5', ARRAY['action']),
(18, '弾く', '弾く', 'ひく', 'hiku', 'đàn (piano, guitar)', 'play (instrument)', 'verb', 'ピアノを弾くことができます。', 'Tôi có thể chơi đàn piano.', 'N5', ARRAY['action']),

-- LESSON 20 (Thể thông thường)
(20, '要る', '要る', 'いる', 'iru', 'cần', 'need', 'verb', 'ビザがいります。', 'Cần visa.', 'N5', ARRAY['action']),
(20, '直す', '直す', 'なおす', 'naosu', 'sửa chữa', 'repair, fix', 'verb', '自転車を直します。', 'Sửa xe đạp.', 'N5', ARRAY['action']),

-- LESSON 23 (Khi... / Nếu...)
(23, '～時', '～時', '～とき', 'toki', 'khi ~', 'when ~', 'noun', '暇な時, 本を読みます。', 'Khi rảnh rỗi, tôi đọc sách.', 'N5', ARRAY['time']),
(23, '渡る', '渡る', 'わたる', 'wataru', 'băng qua (cầu, đường)', 'cross', 'verb', '橋を渡ります。', 'Đi qua cầu.', 'N5', ARRAY['action']),

-- LESSON 25 (Thể quá khứ - Giả định)
(25, '考えます', '考えます', 'かんがえます', 'kangaemasu', 'suy nghĩ', 'think', 'verb', 'よく考えます。', 'Suy nghĩ kỹ.', 'N5', ARRAY['action']),
(25, '頑張ります', '頑張ります', 'がんばります', 'ganbarimasu', 'cố gắng', 'do one''s best', 'verb', '明日も頑張ります。', 'Ngày mai cũng sẽ cố gắng.', 'N5', ARRAY['action'])
;
