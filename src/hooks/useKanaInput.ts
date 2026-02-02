import { useState, useCallback } from 'react';

// Romaji to Hiragana mapping
const romajiToHiragana: Record<string, string> = {
  // Vowels
  'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
  // K-row
  'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
  'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
  // S-row
  'sa': 'さ', 'si': 'し', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
  'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
  'sya': 'しゃ', 'syu': 'しゅ', 'syo': 'しょ',
  // T-row
  'ta': 'た', 'ti': 'ち', 'chi': 'ち', 'tu': 'つ', 'tsu': 'つ', 'te': 'て', 'to': 'と',
  'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ',
  'tya': 'ちゃ', 'tyu': 'ちゅ', 'tyo': 'ちょ',
  // N-row
  'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
  'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
  // H-row
  'ha': 'は', 'hi': 'ひ', 'hu': 'ふ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
  'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
  // M-row
  'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
  'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
  // Y-row
  'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
  // R-row
  'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
  'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
  // W-row
  'wa': 'わ', 'wo': 'を',
  // N (single n only - nn handled specially)
  'n': 'ん',
  // G-row (dakuten)
  'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
  'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
  // Z-row
  'za': 'ざ', 'zi': 'じ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
  'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
  'jya': 'じゃ', 'jyu': 'じゅ', 'jyo': 'じょ',
  // D-row
  'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
  'dya': 'ぢゃ', 'dyu': 'ぢゅ', 'dyo': 'ぢょ',
  // B-row
  'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
  'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
  // P-row (handakuten)
  'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
  'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
  // Small vowels
  'xa': 'ぁ', 'xi': 'ぃ', 'xu': 'ぅ', 'xe': 'ぇ', 'xo': 'ぉ',
  'la': 'ぁ', 'li': 'ぃ', 'lu': 'ぅ', 'le': 'ぇ', 'lo': 'ぉ',
  'xya': 'ゃ', 'xyu': 'ゅ', 'xyo': 'ょ',
  'lya': 'ゃ', 'lyu': 'ゅ', 'lyo': 'ょ',
  'xtu': 'っ', 'xtsu': 'っ', 'ltu': 'っ', 'ltsu': 'っ',
  // Special
  '-': 'ー',
};

// Romaji to Katakana mapping
const romajiToKatakana: Record<string, string> = {};
for (const [romaji, hiragana] of Object.entries(romajiToHiragana)) {
  // Convert hiragana to katakana (Unicode offset)
  const katakana = hiragana.split('').map(char => {
    const code = char.charCodeAt(0);
    // Hiragana range: 0x3040-0x309F, Katakana range: 0x30A0-0x30FF
    if (code >= 0x3041 && code <= 0x3096) {
      return String.fromCharCode(code + 0x60);
    }
    return char;
  }).join('');
  romajiToKatakana[romaji] = katakana;
}
romajiToKatakana['-'] = 'ー';

export type KanaMode = 'off' | 'hiragana' | 'katakana';

// Common Kanji dictionary for suggestions - JLPT N5 & N4 vocabulary
export const kanjiDictionary: Record<string, Array<{ kanji: string; reading: string; meaning: string }>> = {
  // Greetings & Common Phrases
  'こんにちは': [{ kanji: '今日は', reading: 'こんにちは', meaning: 'Xin chào' }],
  'こんにちわ': [{ kanji: '今日は', reading: 'こんにちは', meaning: 'Xin chào' }],
  'こんばんは': [{ kanji: '今晩は', reading: 'こんばんは', meaning: 'Chào buổi tối' }],
  'ありがとう': [{ kanji: '有難う', reading: 'ありがとう', meaning: 'Cảm ơn' }],
  'おはよう': [{ kanji: 'お早う', reading: 'おはよう', meaning: 'Chào buổi sáng' }],
  'さようなら': [{ kanji: '左様なら', reading: 'さようなら', meaning: 'Tạm biệt' }],
  'すみません': [{ kanji: '済みません', reading: 'すみません', meaning: 'Xin lỗi' }],
  'ごめんなさい': [{ kanji: '御免なさい', reading: 'ごめんなさい', meaning: 'Xin lỗi' }],
  'おねがいします': [{ kanji: 'お願いします', reading: 'おねがいします', meaning: 'Làm ơn' }],
  'いただきます': [{ kanji: '頂きます', reading: 'いただきます', meaning: 'Tôi xin nhận (trước bữa ăn)' }],
  'ごちそうさま': [{ kanji: 'ご馳走様', reading: 'ごちそうさま', meaning: 'Cảm ơn bữa ăn' }],
  'おやすみなさい': [{ kanji: 'お休みなさい', reading: 'おやすみなさい', meaning: 'Chúc ngủ ngon' }],
  'おげんきですか': [{ kanji: 'お元気ですか', reading: 'おげんきですか', meaning: 'Bạn khỏe không?' }],
  'はじめまして': [{ kanji: '初めまして', reading: 'はじめまして', meaning: 'Rất vui được gặp' }],

  // Pronouns
  'わたし': [{ kanji: '私', reading: 'わたし', meaning: 'Tôi' }],
  'あなた': [{ kanji: '貴方', reading: 'あなた', meaning: 'Bạn' }],
  'かれ': [{ kanji: '彼', reading: 'かれ', meaning: 'Anh ấy' }],
  'かのじょ': [{ kanji: '彼女', reading: 'かのじょ', meaning: 'Cô ấy' }],
  'わたしたち': [{ kanji: '私達', reading: 'わたしたち', meaning: 'Chúng tôi' }],
  'みんな': [{ kanji: '皆', reading: 'みんな', meaning: 'Mọi người' }],
  'じぶん': [{ kanji: '自分', reading: 'じぶん', meaning: 'Bản thân' }],

  // Countries & Languages
  'にほん': [{ kanji: '日本', reading: 'にほん', meaning: 'Nhật Bản' }],
  'にほんご': [{ kanji: '日本語', reading: 'にほんご', meaning: 'Tiếng Nhật' }],
  'えいご': [{ kanji: '英語', reading: 'えいご', meaning: 'Tiếng Anh' }],
  'ちゅうごく': [{ kanji: '中国', reading: 'ちゅうごく', meaning: 'Trung Quốc' }],
  'ちゅうごくご': [{ kanji: '中国語', reading: 'ちゅうごくご', meaning: 'Tiếng Trung' }],
  'かんこく': [{ kanji: '韓国', reading: 'かんこく', meaning: 'Hàn Quốc' }],
  'べとなむ': [{ kanji: 'ベトナム', reading: 'べとなむ', meaning: 'Việt Nam' }],
  'アメリカ': [{ kanji: 'アメリカ', reading: 'アメリカ', meaning: 'Mỹ' }],

  // School & Education
  'がっこう': [{ kanji: '学校', reading: 'がっこう', meaning: 'Trường học' }],
  'だいがく': [{ kanji: '大学', reading: 'だいがく', meaning: 'Đại học' }],
  'こうこう': [{ kanji: '高校', reading: 'こうこう', meaning: 'Trung học phổ thông' }],
  'ちゅうがっこう': [{ kanji: '中学校', reading: 'ちゅうがっこう', meaning: 'Trung học cơ sở' }],
  'しょうがっこう': [{ kanji: '小学校', reading: 'しょうがっこう', meaning: 'Tiểu học' }],
  'せんせい': [{ kanji: '先生', reading: 'せんせい', meaning: 'Giáo viên' }],
  'がくせい': [{ kanji: '学生', reading: 'がくせい', meaning: 'Sinh viên' }],
  'せいと': [{ kanji: '生徒', reading: 'せいと', meaning: 'Học sinh' }],
  'きょうしつ': [{ kanji: '教室', reading: 'きょうしつ', meaning: 'Phòng học' }],
  'としょかん': [{ kanji: '図書館', reading: 'としょかん', meaning: 'Thư viện' }],
  'しゅくだい': [{ kanji: '宿題', reading: 'しゅくだい', meaning: 'Bài tập về nhà' }],
  'しけん': [{ kanji: '試験', reading: 'しけん', meaning: 'Kỳ thi' }],
  'もんだい': [{ kanji: '問題', reading: 'もんだい', meaning: 'Vấn đề, câu hỏi' }],
  'こたえ': [{ kanji: '答え', reading: 'こたえ', meaning: 'Câu trả lời' }],
  'べんきょう': [{ kanji: '勉強', reading: 'べんきょう', meaning: 'Học tập' }],
  'れんしゅう': [{ kanji: '練習', reading: 'れんしゅう', meaning: 'Luyện tập' }],

  // Family
  'かぞく': [{ kanji: '家族', reading: 'かぞく', meaning: 'Gia đình' }],
  'おとうさん': [{ kanji: 'お父さん', reading: 'おとうさん', meaning: 'Bố' }],
  'おかあさん': [{ kanji: 'お母さん', reading: 'おかあさん', meaning: 'Mẹ' }],
  'ちち': [{ kanji: '父', reading: 'ちち', meaning: 'Bố (khiêm tốn)' }],
  'はは': [{ kanji: '母', reading: 'はは', meaning: 'Mẹ (khiêm tốn)' }],
  'おにいさん': [{ kanji: 'お兄さん', reading: 'おにいさん', meaning: 'Anh trai' }],
  'おねえさん': [{ kanji: 'お姉さん', reading: 'おねえさん', meaning: 'Chị gái' }],
  'あに': [{ kanji: '兄', reading: 'あに', meaning: 'Anh trai (khiêm tốn)' }],
  'あね': [{ kanji: '姉', reading: 'あね', meaning: 'Chị gái (khiêm tốn)' }],
  'いもうと': [{ kanji: '妹', reading: 'いもうと', meaning: 'Em gái' }],
  'おとうと': [{ kanji: '弟', reading: 'おとうと', meaning: 'Em trai' }],
  'おじいさん': [{ kanji: 'お祖父さん', reading: 'おじいさん', meaning: 'Ông' }],
  'おばあさん': [{ kanji: 'お祖母さん', reading: 'おばあさん', meaning: 'Bà' }],
  'こども': [{ kanji: '子供', reading: 'こども', meaning: 'Trẻ em' }],
  'むすこ': [{ kanji: '息子', reading: 'むすこ', meaning: 'Con trai' }],
  'むすめ': [{ kanji: '娘', reading: 'むすめ', meaning: 'Con gái' }],
  'ともだち': [{ kanji: '友達', reading: 'ともだち', meaning: 'Bạn bè' }],

  // Body Parts
  'あたま': [{ kanji: '頭', reading: 'あたま', meaning: 'Đầu' }],
  'かお': [{ kanji: '顔', reading: 'かお', meaning: 'Mặt' }],
  'め': [{ kanji: '目', reading: 'め', meaning: 'Mắt' }],
  'みみ': [{ kanji: '耳', reading: 'みみ', meaning: 'Tai' }],
  'はな': [{ kanji: '鼻', reading: 'はな', meaning: 'Mũi' }, { kanji: '花', reading: 'はな', meaning: 'Hoa' }],
  'くち': [{ kanji: '口', reading: 'くち', meaning: 'Miệng' }],
  'て': [{ kanji: '手', reading: 'て', meaning: 'Tay' }],
  'あし': [{ kanji: '足', reading: 'あし', meaning: 'Chân' }],
  'からだ': [{ kanji: '体', reading: 'からだ', meaning: 'Cơ thể' }],

  // Common Verbs
  'たべる': [{ kanji: '食べる', reading: 'たべる', meaning: 'Ăn' }],
  'のむ': [{ kanji: '飲む', reading: 'のむ', meaning: 'Uống' }],
  'みる': [{ kanji: '見る', reading: 'みる', meaning: 'Xem' }],
  'きく': [{ kanji: '聞く', reading: 'きく', meaning: 'Nghe' }],
  'かく': [{ kanji: '書く', reading: 'かく', meaning: 'Viết' }],
  'よむ': [{ kanji: '読む', reading: 'よむ', meaning: 'Đọc' }],
  'はなす': [{ kanji: '話す', reading: 'はなす', meaning: 'Nói' }],
  'いく': [{ kanji: '行く', reading: 'いく', meaning: 'Đi' }],
  'くる': [{ kanji: '来る', reading: 'くる', meaning: 'Đến' }],
  'かえる': [{ kanji: '帰る', reading: 'かえる', meaning: 'Về nhà' }],
  'する': [{ kanji: 'する', reading: 'する', meaning: 'Làm' }],
  'ある': [{ kanji: '有る', reading: 'ある', meaning: 'Có (vật)' }],
  'いる': [{ kanji: '居る', reading: 'いる', meaning: 'Có (người)' }],
  'おきる': [{ kanji: '起きる', reading: 'おきる', meaning: 'Thức dậy' }],
  'ねる': [{ kanji: '寝る', reading: 'ねる', meaning: 'Ngủ' }],
  'あそぶ': [{ kanji: '遊ぶ', reading: 'あそぶ', meaning: 'Chơi' }],
  'はたらく': [{ kanji: '働く', reading: 'はたらく', meaning: 'Làm việc' }],
  'やすむ': [{ kanji: '休む', reading: 'やすむ', meaning: 'Nghỉ ngơi' }],
  'まつ': [{ kanji: '待つ', reading: 'まつ', meaning: 'Đợi' }],
  'おしえる': [{ kanji: '教える', reading: 'おしえる', meaning: 'Dạy' }],
  'ならう': [{ kanji: '習う', reading: 'ならう', meaning: 'Học (từ ai)' }],
  'わかる': [{ kanji: '分かる', reading: 'わかる', meaning: 'Hiểu' }],
  'しる': [{ kanji: '知る', reading: 'しる', meaning: 'Biết' }],
  'おもう': [{ kanji: '思う', reading: 'おもう', meaning: 'Nghĩ' }],
  'かんがえる': [{ kanji: '考える', reading: 'かんがえる', meaning: 'Suy nghĩ' }],
  'つかう': [{ kanji: '使う', reading: 'つかう', meaning: 'Sử dụng' }],
  'かう': [{ kanji: '買う', reading: 'かう', meaning: 'Mua' }],
  'うる': [{ kanji: '売る', reading: 'うる', meaning: 'Bán' }],
  'つくる': [{ kanji: '作る', reading: 'つくる', meaning: 'Làm, tạo' }],
  'あう': [{ kanji: '会う', reading: 'あう', meaning: 'Gặp' }],
  'もつ': [{ kanji: '持つ', reading: 'もつ', meaning: 'Mang, cầm' }],
  'わすれる': [{ kanji: '忘れる', reading: 'わすれる', meaning: 'Quên' }],
  'おぼえる': [{ kanji: '覚える', reading: 'おぼえる', meaning: 'Nhớ' }],
  'はじまる': [{ kanji: '始まる', reading: 'はじまる', meaning: 'Bắt đầu' }],
  'おわる': [{ kanji: '終わる', reading: 'おわる', meaning: 'Kết thúc' }],
  'あける': [{ kanji: '開ける', reading: 'あける', meaning: 'Mở' }],
  'しめる': [{ kanji: '閉める', reading: 'しめる', meaning: 'Đóng' }],
  'でる': [{ kanji: '出る', reading: 'でる', meaning: 'Ra ngoài' }],
  'はいる': [{ kanji: '入る', reading: 'はいる', meaning: 'Vào' }],

  // Adjectives
  'おおきい': [{ kanji: '大きい', reading: 'おおきい', meaning: 'To, lớn' }],
  'ちいさい': [{ kanji: '小さい', reading: 'ちいさい', meaning: 'Nhỏ' }],
  'たかい': [{ kanji: '高い', reading: 'たかい', meaning: 'Cao, đắt' }],
  'ひくい': [{ kanji: '低い', reading: 'ひくい', meaning: 'Thấp' }],
  'やすい': [{ kanji: '安い', reading: 'やすい', meaning: 'Rẻ' }],
  'あたらしい': [{ kanji: '新しい', reading: 'あたらしい', meaning: 'Mới' }],
  'ふるい': [{ kanji: '古い', reading: 'ふるい', meaning: 'Cũ' }],
  'いい': [{ kanji: '良い', reading: 'いい', meaning: 'Tốt' }],
  'よい': [{ kanji: '良い', reading: 'よい', meaning: 'Tốt' }],
  'わるい': [{ kanji: '悪い', reading: 'わるい', meaning: 'Xấu' }],
  'きれい': [{ kanji: '綺麗', reading: 'きれい', meaning: 'Đẹp, sạch' }],
  'げんき': [{ kanji: '元気', reading: 'げんき', meaning: 'Khỏe mạnh' }],
  'ながい': [{ kanji: '長い', reading: 'ながい', meaning: 'Dài' }],
  'みじかい': [{ kanji: '短い', reading: 'みじかい', meaning: 'Ngắn' }],
  'あつい': [{ kanji: '暑い', reading: 'あつい', meaning: 'Nóng (thời tiết)' }],
  'さむい': [{ kanji: '寒い', reading: 'さむい', meaning: 'Lạnh' }],
  'あたたかい': [{ kanji: '暖かい', reading: 'あたたかい', meaning: 'Ấm áp' }],
  'すずしい': [{ kanji: '涼しい', reading: 'すずしい', meaning: 'Mát mẻ' }],
  'おもしろい': [{ kanji: '面白い', reading: 'おもしろい', meaning: 'Thú vị' }],
  'つまらない': [{ kanji: 'つまらない', reading: 'つまらない', meaning: 'Chán' }],
  'むずかしい': [{ kanji: '難しい', reading: 'むずかしい', meaning: 'Khó' }],
  'やさしい': [{ kanji: '易しい', reading: 'やさしい', meaning: 'Dễ' }],
  'たのしい': [{ kanji: '楽しい', reading: 'たのしい', meaning: 'Vui' }],
  'かなしい': [{ kanji: '悲しい', reading: 'かなしい', meaning: 'Buồn' }],
  'うれしい': [{ kanji: '嬉しい', reading: 'うれしい', meaning: 'Vui mừng' }],
  'いそがしい': [{ kanji: '忙しい', reading: 'いそがしい', meaning: 'Bận' }],
  'ひま': [{ kanji: '暇', reading: 'ひま', meaning: 'Rảnh' }],
  'しずか': [{ kanji: '静か', reading: 'しずか', meaning: 'Yên tĩnh' }],
  'にぎやか': [{ kanji: '賑やか', reading: 'にぎやか', meaning: 'Nhộn nhịp' }],
  'べんり': [{ kanji: '便利', reading: 'べんり', meaning: 'Tiện lợi' }],
  'ゆうめい': [{ kanji: '有名', reading: 'ゆうめい', meaning: 'Nổi tiếng' }],
  'じょうず': [{ kanji: '上手', reading: 'じょうず', meaning: 'Giỏi' }],
  'へた': [{ kanji: '下手', reading: 'へた', meaning: 'Kém' }],

  // Nature
  'みず': [{ kanji: '水', reading: 'みず', meaning: 'Nước' }],
  'やま': [{ kanji: '山', reading: 'やま', meaning: 'Núi' }],
  'かわ': [{ kanji: '川', reading: 'かわ', meaning: 'Sông' }],
  'うみ': [{ kanji: '海', reading: 'うみ', meaning: 'Biển' }],
  'そら': [{ kanji: '空', reading: 'そら', meaning: 'Bầu trời' }],
  'ひ': [{ kanji: '日', reading: 'ひ', meaning: 'Ngày, mặt trời' }],
  'つき': [{ kanji: '月', reading: 'つき', meaning: 'Tháng, mặt trăng' }],
  'ほし': [{ kanji: '星', reading: 'ほし', meaning: 'Ngôi sao' }],
  'き': [{ kanji: '木', reading: 'き', meaning: 'Cây' }],
  
  'あめ': [{ kanji: '雨', reading: 'あめ', meaning: 'Mưa' }],
  'ゆき': [{ kanji: '雪', reading: 'ゆき', meaning: 'Tuyết' }],
  'かぜ': [{ kanji: '風', reading: 'かぜ', meaning: 'Gió' }],
  'てんき': [{ kanji: '天気', reading: 'てんき', meaning: 'Thời tiết' }],
  'はる': [{ kanji: '春', reading: 'はる', meaning: 'Mùa xuân' }],
  'なつ': [{ kanji: '夏', reading: 'なつ', meaning: 'Mùa hè' }],
  'あき': [{ kanji: '秋', reading: 'あき', meaning: 'Mùa thu' }],
  'ふゆ': [{ kanji: '冬', reading: 'ふゆ', meaning: 'Mùa đông' }],

  // Animals
  'いぬ': [{ kanji: '犬', reading: 'いぬ', meaning: 'Chó' }],
  'ねこ': [{ kanji: '猫', reading: 'ねこ', meaning: 'Mèo' }],
  'とり': [{ kanji: '鳥', reading: 'とり', meaning: 'Chim' }],
  'さかな': [{ kanji: '魚', reading: 'さかな', meaning: 'Cá' }],
  'うし': [{ kanji: '牛', reading: 'うし', meaning: 'Bò' }],
  'ぶた': [{ kanji: '豚', reading: 'ぶた', meaning: 'Lợn' }],
  'うま': [{ kanji: '馬', reading: 'うま', meaning: 'Ngựa' }],

  // Places & Transport
  'くるま': [{ kanji: '車', reading: 'くるま', meaning: 'Xe' }],
  'でんしゃ': [{ kanji: '電車', reading: 'でんしゃ', meaning: 'Tàu điện' }],
  'えき': [{ kanji: '駅', reading: 'えき', meaning: 'Ga tàu' }],
  'くうこう': [{ kanji: '空港', reading: 'くうこう', meaning: 'Sân bay' }],
  'ひこうき': [{ kanji: '飛行機', reading: 'ひこうき', meaning: 'Máy bay' }],
  'じてんしゃ': [{ kanji: '自転車', reading: 'じてんしゃ', meaning: 'Xe đạp' }],
  'みせ': [{ kanji: '店', reading: 'みせ', meaning: 'Cửa hàng' }],
  'いえ': [{ kanji: '家', reading: 'いえ', meaning: 'Nhà' }],
  'へや': [{ kanji: '部屋', reading: 'へや', meaning: 'Phòng' }],
  'まち': [{ kanji: '町', reading: 'まち', meaning: 'Thị trấn' }],
  'くに': [{ kanji: '国', reading: 'くに', meaning: 'Quốc gia' }],
  'びょういん': [{ kanji: '病院', reading: 'びょういん', meaning: 'Bệnh viện' }],
  'ぎんこう': [{ kanji: '銀行', reading: 'ぎんこう', meaning: 'Ngân hàng' }],
  'ゆうびんきょく': [{ kanji: '郵便局', reading: 'ゆうびんきょく', meaning: 'Bưu điện' }],
  'こうえん': [{ kanji: '公園', reading: 'こうえん', meaning: 'Công viên' }],
  'レストラン': [{ kanji: 'レストラン', reading: 'れすとらん', meaning: 'Nhà hàng' }],
  'かいしゃ': [{ kanji: '会社', reading: 'かいしゃ', meaning: 'Công ty' }],

  // People
  'ひと': [{ kanji: '人', reading: 'ひと', meaning: 'Người' }],
  'おとこ': [{ kanji: '男', reading: 'おとこ', meaning: 'Nam' }],
  'おんな': [{ kanji: '女', reading: 'おんな', meaning: 'Nữ' }],
  'おとこのこ': [{ kanji: '男の子', reading: 'おとこのこ', meaning: 'Con trai' }],
  'おんなのこ': [{ kanji: '女の子', reading: 'おんなのこ', meaning: 'Con gái' }],

  // Time
  'ことば': [{ kanji: '言葉', reading: 'ことば', meaning: 'Từ ngữ' }],
  'なまえ': [{ kanji: '名前', reading: 'なまえ', meaning: 'Tên' }],
  'じかん': [{ kanji: '時間', reading: 'じかん', meaning: 'Thời gian' }],
  'きょう': [{ kanji: '今日', reading: 'きょう', meaning: 'Hôm nay' }],
  'あした': [{ kanji: '明日', reading: 'あした', meaning: 'Ngày mai' }],
  'きのう': [{ kanji: '昨日', reading: 'きのう', meaning: 'Hôm qua' }],
  'いま': [{ kanji: '今', reading: 'いま', meaning: 'Bây giờ' }],
  'まいにち': [{ kanji: '毎日', reading: 'まいにち', meaning: 'Mỗi ngày' }],
  'まいあさ': [{ kanji: '毎朝', reading: 'まいあさ', meaning: 'Mỗi sáng' }],
  'まいばん': [{ kanji: '毎晩', reading: 'まいばん', meaning: 'Mỗi tối' }],
  'こんしゅう': [{ kanji: '今週', reading: 'こんしゅう', meaning: 'Tuần này' }],
  'らいしゅう': [{ kanji: '来週', reading: 'らいしゅう', meaning: 'Tuần sau' }],
  'せんしゅう': [{ kanji: '先週', reading: 'せんしゅう', meaning: 'Tuần trước' }],
  'こんげつ': [{ kanji: '今月', reading: 'こんげつ', meaning: 'Tháng này' }],
  'らいげつ': [{ kanji: '来月', reading: 'らいげつ', meaning: 'Tháng sau' }],
  'せんげつ': [{ kanji: '先月', reading: 'せんげつ', meaning: 'Tháng trước' }],
  'ことし': [{ kanji: '今年', reading: 'ことし', meaning: 'Năm nay' }],
  'らいねん': [{ kanji: '来年', reading: 'らいねん', meaning: 'Năm sau' }],
  'きょねん': [{ kanji: '去年', reading: 'きょねん', meaning: 'Năm ngoái' }],
  'あさ': [{ kanji: '朝', reading: 'あさ', meaning: 'Buổi sáng' }],
  'ひる': [{ kanji: '昼', reading: 'ひる', meaning: 'Buổi trưa' }],
  'よる': [{ kanji: '夜', reading: 'よる', meaning: 'Buổi tối' }],
  'ばん': [{ kanji: '晩', reading: 'ばん', meaning: 'Buổi tối' }],
  'ごぜん': [{ kanji: '午前', reading: 'ごぜん', meaning: 'Buổi sáng (AM)' }],
  'ごご': [{ kanji: '午後', reading: 'ごご', meaning: 'Buổi chiều (PM)' }],

  // Food & Drink
  'ごはん': [{ kanji: 'ご飯', reading: 'ごはん', meaning: 'Cơm' }],
  'おちゃ': [{ kanji: 'お茶', reading: 'おちゃ', meaning: 'Trà' }],
  'みそしる': [{ kanji: '味噌汁', reading: 'みそしる', meaning: 'Súp miso' }],
  'にく': [{ kanji: '肉', reading: 'にく', meaning: 'Thịt' }],
  'やさい': [{ kanji: '野菜', reading: 'やさい', meaning: 'Rau' }],
  'くだもの': [{ kanji: '果物', reading: 'くだもの', meaning: 'Trái cây' }],
  'たまご': [{ kanji: '卵', reading: 'たまご', meaning: 'Trứng' }],
  'パン': [{ kanji: 'パン', reading: 'ぱん', meaning: 'Bánh mì' }],

  // Work & Business
  'しごと': [{ kanji: '仕事', reading: 'しごと', meaning: 'Công việc' }],
  'かいぎ': [{ kanji: '会議', reading: 'かいぎ', meaning: 'Cuộc họp' }],
  'でんわ': [{ kanji: '電話', reading: 'でんわ', meaning: 'Điện thoại' }],
  'メール': [{ kanji: 'メール', reading: 'めーる', meaning: 'Email' }],

  // Other common words
  'おかね': [{ kanji: 'お金', reading: 'おかね', meaning: 'Tiền' }],
  'じしょ': [{ kanji: '辞書', reading: 'じしょ', meaning: 'Từ điển' }],
  'ほん': [{ kanji: '本', reading: 'ほん', meaning: 'Sách' }],
  'しんぶん': [{ kanji: '新聞', reading: 'しんぶん', meaning: 'Báo' }],
  'ざっし': [{ kanji: '雑誌', reading: 'ざっし', meaning: 'Tạp chí' }],
  'えいが': [{ kanji: '映画', reading: 'えいが', meaning: 'Phim' }],
  'おんがく': [{ kanji: '音楽', reading: 'おんがく', meaning: 'Âm nhạc' }],
  'りょこう': [{ kanji: '旅行', reading: 'りょこう', meaning: 'Du lịch' }],
  'しゃしん': [{ kanji: '写真', reading: 'しゃしん', meaning: 'Ảnh' }],
  'ニュース': [{ kanji: 'ニュース', reading: 'にゅーす', meaning: 'Tin tức' }],
  'いみ': [{ kanji: '意味', reading: 'いみ', meaning: 'Ý nghĩa' }],
  'れい': [{ kanji: '例', reading: 'れい', meaning: 'Ví dụ' }],
  'せつめい': [{ kanji: '説明', reading: 'せつめい', meaning: 'Giải thích' }],
  'しつもん': [{ kanji: '質問', reading: 'しつもん', meaning: 'Câu hỏi' }],
};

export const useKanaInput = () => {
  const [mode, setMode] = useState<KanaMode>('off');
  const [buffer, setBuffer] = useState('');

  const convertToKana = useCallback((input: string, kanaMode: 'hiragana' | 'katakana'): { result: string; remaining: string } => {
    const map = kanaMode === 'hiragana' ? romajiToHiragana : romajiToKatakana;
    let result = '';
    let remaining = input.toLowerCase();

    while (remaining.length > 0) {
      let matched = false;

      // Try to match double consonant (small tsu) - NOT for 'n'
      if (remaining.length >= 2 && 
          remaining[0] === remaining[1] && 
          'kstfhcgzjdbp'.includes(remaining[0])) {
        result += kanaMode === 'hiragana' ? 'っ' : 'ッ';
        remaining = remaining.slice(1);
        matched = true;
        continue;
      }

      // Special case: 'nn' followed by vowel/y should be ん + keep second n for next syllable
      // e.g., 'nni' → ん + ni → んに, 'nna' → ん + na → んな
      if (remaining.length >= 3 && 
          remaining[0] === 'n' && 
          remaining[1] === 'n' &&
          'aiueoy'.includes(remaining[2])) {
        result += kanaMode === 'hiragana' ? 'ん' : 'ン';
        remaining = remaining.slice(1); // Only consume one 'n', leave 'n' + vowel
        matched = true;
        continue;
      }

      // 'nn' at end or before consonant → ん (consume both)
      if (remaining.length >= 2 && 
          remaining[0] === 'n' && 
          remaining[1] === 'n' &&
          (remaining.length === 2 || !'aiueoy'.includes(remaining[2]))) {
        result += kanaMode === 'hiragana' ? 'ん' : 'ン';
        remaining = remaining.slice(2); // Consume both 'n's
        matched = true;
        continue;
      }

      // Try to match 4, 3, 2, 1 character sequences
      for (const len of [4, 3, 2, 1]) {
        if (remaining.length >= len) {
          const substr = remaining.slice(0, len);
          if (map[substr]) {
            result += map[substr];
            remaining = remaining.slice(len);
            matched = true;
            break;
          }
        }
      }

      // Handle single 'n' at end of input - keep in buffer
      if (!matched && remaining[0] === 'n' && remaining.length === 1) {
        break;
      }

      // Handle 'n' before consonant (not 'n' and not 'y')
      if (!matched && remaining[0] === 'n' && remaining.length >= 2) {
        const next = remaining[1];
        if (!'aiueony'.includes(next)) {
          result += kanaMode === 'hiragana' ? 'ん' : 'ン';
          remaining = remaining.slice(1);
          matched = true;
          continue;
        }
      }

      if (!matched) {
        // Check if current sequence could be start of valid romaji
        let couldMatch = false;
        for (const key of Object.keys(map)) {
          if (key.startsWith(remaining.toLowerCase())) {
            couldMatch = true;
            break;
          }
        }
        
        if (couldMatch) {
          // Keep in buffer
          break;
        } else {
          // Pass through unchanged
          result += remaining[0];
          remaining = remaining.slice(1);
        }
      }
    }

    return { result, remaining };
  }, []);

  const processInput = useCallback((newValue: string, currentValue: string): string => {
    if (mode === 'off') {
      setBuffer('');
      return newValue;
    }

    // If deleting, return as-is and clear buffer
    if (newValue.length < currentValue.length) {
      setBuffer('');
      return newValue;
    }

    // Get new characters typed
    const newChars = newValue.slice(currentValue.length);
    const combined = buffer + newChars;
    
    const { result, remaining } = convertToKana(combined, mode);
    setBuffer(remaining);

    // Return the current value without the buffer portion, plus new result and remaining
    const baseValue = currentValue.slice(0, currentValue.length);
    return baseValue + result + remaining;
  }, [mode, buffer, convertToKana]);

  const resetBuffer = useCallback(() => {
    setBuffer('');
  }, []);

  const cycleMode = useCallback(() => {
    setMode(current => {
      if (current === 'off') return 'hiragana';
      if (current === 'hiragana') return 'katakana';
      return 'off';
    });
    setBuffer('');
  }, []);

  // Get Kanji suggestions for given hiragana text
  const getKanjiSuggestions = useCallback((hiraganaText: string): Array<{ kanji: string; reading: string; meaning: string }> => {
    if (!hiraganaText || hiraganaText.length < 2) return [];
    
    const suggestions: Array<{ kanji: string; reading: string; meaning: string }> = [];
    
    // Look for exact matches
    if (kanjiDictionary[hiraganaText]) {
      suggestions.push(...kanjiDictionary[hiraganaText]);
    }
    
    // Look for partial matches (words that start with the input)
    for (const [reading, entries] of Object.entries(kanjiDictionary)) {
      if (reading.startsWith(hiraganaText) && reading !== hiraganaText) {
        suggestions.push(...entries);
      }
    }
    
    // Look for words that contain the input
    for (const [reading, entries] of Object.entries(kanjiDictionary)) {
      if (reading.includes(hiraganaText) && !reading.startsWith(hiraganaText)) {
        suggestions.push(...entries);
      }
    }
    
    // Remove duplicates and limit results
    const unique = suggestions.filter((item, index, self) => 
      index === self.findIndex(t => t.kanji === item.kanji)
    );
    
    return unique.slice(0, 5);
  }, []);

  return {
    mode,
    setMode,
    cycleMode,
    processInput,
    resetBuffer,
    buffer,
    getKanjiSuggestions,
  };
};
