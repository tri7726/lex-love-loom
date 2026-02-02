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

// Common Kanji dictionary for suggestions
export const kanjiDictionary: Record<string, Array<{ kanji: string; reading: string; meaning: string }>> = {
  'こんにちは': [{ kanji: '今日は', reading: 'こんにちは', meaning: 'Xin chào' }],
  'こんにちわ': [{ kanji: '今日は', reading: 'こんにちは', meaning: 'Xin chào' }],
  'ありがとう': [{ kanji: '有難う', reading: 'ありがとう', meaning: 'Cảm ơn' }],
  'おはよう': [{ kanji: 'お早う', reading: 'おはよう', meaning: 'Chào buổi sáng' }],
  'さようなら': [{ kanji: '左様なら', reading: 'さようなら', meaning: 'Tạm biệt' }],
  'すみません': [{ kanji: '済みません', reading: 'すみません', meaning: 'Xin lỗi' }],
  'わたし': [{ kanji: '私', reading: 'わたし', meaning: 'Tôi' }],
  'あなた': [{ kanji: '貴方', reading: 'あなた', meaning: 'Bạn' }],
  'にほん': [{ kanji: '日本', reading: 'にほん', meaning: 'Nhật Bản' }],
  'にほんご': [{ kanji: '日本語', reading: 'にほんご', meaning: 'Tiếng Nhật' }],
  'がっこう': [{ kanji: '学校', reading: 'がっこう', meaning: 'Trường học' }],
  'せんせい': [{ kanji: '先生', reading: 'せんせい', meaning: 'Giáo viên' }],
  'がくせい': [{ kanji: '学生', reading: 'がくせい', meaning: 'Học sinh' }],
  'ともだち': [{ kanji: '友達', reading: 'ともだち', meaning: 'Bạn bè' }],
  'かぞく': [{ kanji: '家族', reading: 'かぞく', meaning: 'Gia đình' }],
  'おとうさん': [{ kanji: 'お父さん', reading: 'おとうさん', meaning: 'Bố' }],
  'おかあさん': [{ kanji: 'お母さん', reading: 'おかあさん', meaning: 'Mẹ' }],
  'おにいさん': [{ kanji: 'お兄さん', reading: 'おにいさん', meaning: 'Anh trai' }],
  'おねえさん': [{ kanji: 'お姉さん', reading: 'おねえさん', meaning: 'Chị gái' }],
  'いもうと': [{ kanji: '妹', reading: 'いもうと', meaning: 'Em gái' }],
  'おとうと': [{ kanji: '弟', reading: 'おとうと', meaning: 'Em trai' }],
  'たべる': [{ kanji: '食べる', reading: 'たべる', meaning: 'Ăn' }],
  'のむ': [{ kanji: '飲む', reading: 'のむ', meaning: 'Uống' }],
  'みる': [{ kanji: '見る', reading: 'みる', meaning: 'Xem' }],
  'きく': [{ kanji: '聞く', reading: 'きく', meaning: 'Nghe' }],
  'かく': [{ kanji: '書く', reading: 'かく', meaning: 'Viết' }],
  'よむ': [{ kanji: '読む', reading: 'よむ', meaning: 'Đọc' }],
  'はなす': [{ kanji: '話す', reading: 'はなす', meaning: 'Nói' }],
  'いく': [{ kanji: '行く', reading: 'いく', meaning: 'Đi' }],
  'くる': [{ kanji: '来る', reading: 'くる', meaning: 'Đến' }],
  'する': [{ kanji: 'する', reading: 'する', meaning: 'Làm' }],
  'ある': [{ kanji: '有る', reading: 'ある', meaning: 'Có (vật)' }],
  'いる': [{ kanji: '居る', reading: 'いる', meaning: 'Có (người)' }],
  'おおきい': [{ kanji: '大きい', reading: 'おおきい', meaning: 'To, lớn' }],
  'ちいさい': [{ kanji: '小さい', reading: 'ちいさい', meaning: 'Nhỏ' }],
  'たかい': [{ kanji: '高い', reading: 'たかい', meaning: 'Cao, đắt' }],
  'やすい': [{ kanji: '安い', reading: 'やすい', meaning: 'Rẻ' }],
  'あたらしい': [{ kanji: '新しい', reading: 'あたらしい', meaning: 'Mới' }],
  'ふるい': [{ kanji: '古い', reading: 'ふるい', meaning: 'Cũ' }],
  'いい': [{ kanji: '良い', reading: 'いい', meaning: 'Tốt' }],
  'わるい': [{ kanji: '悪い', reading: 'わるい', meaning: 'Xấu' }],
  'きれい': [{ kanji: '綺麗', reading: 'きれい', meaning: 'Đẹp' }],
  'げんき': [{ kanji: '元気', reading: 'げんき', meaning: 'Khỏe' }],
  'ひと': [{ kanji: '人', reading: 'ひと', meaning: 'Người' }],
  'おとこ': [{ kanji: '男', reading: 'おとこ', meaning: 'Nam' }],
  'おんな': [{ kanji: '女', reading: 'おんな', meaning: 'Nữ' }],
  'こども': [{ kanji: '子供', reading: 'こども', meaning: 'Trẻ em' }],
  'みず': [{ kanji: '水', reading: 'みず', meaning: 'Nước' }],
  'やま': [{ kanji: '山', reading: 'やま', meaning: 'Núi' }],
  'かわ': [{ kanji: '川', reading: 'かわ', meaning: 'Sông' }],
  'うみ': [{ kanji: '海', reading: 'うみ', meaning: 'Biển' }],
  'そら': [{ kanji: '空', reading: 'そら', meaning: 'Bầu trời' }],
  'ひ': [{ kanji: '日', reading: 'ひ', meaning: 'Ngày, mặt trời' }],
  'つき': [{ kanji: '月', reading: 'つき', meaning: 'Tháng, mặt trăng' }],
  'ほし': [{ kanji: '星', reading: 'ほし', meaning: 'Ngôi sao' }],
  'き': [{ kanji: '木', reading: 'き', meaning: 'Cây' }],
  'はな': [{ kanji: '花', reading: 'はな', meaning: 'Hoa' }],
  'いぬ': [{ kanji: '犬', reading: 'いぬ', meaning: 'Chó' }],
  'ねこ': [{ kanji: '猫', reading: 'ねこ', meaning: 'Mèo' }],
  'とり': [{ kanji: '鳥', reading: 'とり', meaning: 'Chim' }],
  'さかな': [{ kanji: '魚', reading: 'さかな', meaning: 'Cá' }],
  'くるま': [{ kanji: '車', reading: 'くるま', meaning: 'Xe' }],
  'でんしゃ': [{ kanji: '電車', reading: 'でんしゃ', meaning: 'Tàu điện' }],
  'えき': [{ kanji: '駅', reading: 'えき', meaning: 'Ga tàu' }],
  'みせ': [{ kanji: '店', reading: 'みせ', meaning: 'Cửa hàng' }],
  'いえ': [{ kanji: '家', reading: 'いえ', meaning: 'Nhà' }],
  'へや': [{ kanji: '部屋', reading: 'へや', meaning: 'Phòng' }],
  'まち': [{ kanji: '町', reading: 'まち', meaning: 'Thị trấn' }],
  'くに': [{ kanji: '国', reading: 'くに', meaning: 'Quốc gia' }],
  'ことば': [{ kanji: '言葉', reading: 'ことば', meaning: 'Từ ngữ' }],
  'なまえ': [{ kanji: '名前', reading: 'なまえ', meaning: 'Tên' }],
  'じかん': [{ kanji: '時間', reading: 'じかん', meaning: 'Thời gian' }],
  'きょう': [{ kanji: '今日', reading: 'きょう', meaning: 'Hôm nay' }],
  'あした': [{ kanji: '明日', reading: 'あした', meaning: 'Ngày mai' }],
  'きのう': [{ kanji: '昨日', reading: 'きのう', meaning: 'Hôm qua' }],
  'いま': [{ kanji: '今', reading: 'いま', meaning: 'Bây giờ' }],
  'あさ': [{ kanji: '朝', reading: 'あさ', meaning: 'Buổi sáng' }],
  'ひる': [{ kanji: '昼', reading: 'ひる', meaning: 'Buổi trưa' }],
  'よる': [{ kanji: '夜', reading: 'よる', meaning: 'Buổi tối' }],
  'ごはん': [{ kanji: 'ご飯', reading: 'ごはん', meaning: 'Cơm' }],
  'おちゃ': [{ kanji: 'お茶', reading: 'おちゃ', meaning: 'Trà' }],
  'しごと': [{ kanji: '仕事', reading: 'しごと', meaning: 'Công việc' }],
  'べんきょう': [{ kanji: '勉強', reading: 'べんきょう', meaning: 'Học tập' }],
  'れんしゅう': [{ kanji: '練習', reading: 'れんしゅう', meaning: 'Luyện tập' }],
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
