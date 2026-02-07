import { useState, useCallback } from 'react';

// Romaji to Hiragana mapping
const romajiToHiragana: Record<string, string> = {
  // Vowels
  'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
  'yi': 'い', 'wu': 'う', 'whu': 'う',
  // K-row
  'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
  'kya': 'きゃ', 'kyi': 'きぃ', 'kyu': 'きゅ', 'kye': 'きぇ', 'kyo': 'きょ',
  // S-row
  'sa': 'さ', 'si': 'し', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
  'sha': 'しゃ', 'shu': 'しゅ', 'she': 'しぇ', 'sho': 'しょ',
  'sya': 'しゃ', 'syi': 'しぃ', 'syu': 'しゅ', 'sye': 'しぇ', 'syo': 'しょ',
  // T-row
  'ta': 'た', 'ti': 'ち', 'chi': 'ち', 'tu': 'つ', 'tsu': 'つ', 'te': 'て', 'to': 'と',
  'cha': 'ちゃ', 'chu': 'ちゅ', 'che': 'ちぇ', 'cho': 'ちょ',
  'tya': 'ちゃ', 'tyi': 'ちぃ', 'tyu': 'ちゅ', 'tye': 'ちぇ', 'tyo': 'ちょ',
  // N-row
  'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
  'nya': 'にゃ', 'nyi': 'にぃ', 'nyu': 'にゅ', 'nye': 'にぇ', 'nyo': 'にょ',
  // H-row
  'ha': 'は', 'hi': 'ひ', 'hu': 'ふ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
  'hya': 'ひゃ', 'hyi': 'ひぃ', 'hyu': 'ひゅ', 'hye': 'ひぇ', 'hyo': 'ひょ',
  'fya': 'ふゃ', 'fyi': 'ふぃ', 'fyu': 'ふゅ', 'fye': 'ふぇ', 'fyo': 'ふょ',
  // M-row
  'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
  'mya': 'みゃ', 'myi': 'みぃ', 'myu': 'みゅ', 'mye': 'みぇ', 'myo': 'みょ',
  // Y-row
  'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
  // R-row
  'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
  'rya': 'りゃ', 'ryi': 'りぃ', 'ryu': 'りゅ', 'rye': 'りぇ', 'ryo': 'りょ',
  // W-row
  'wa': 'わ', 'wo': 'を', 'wi': 'うぃ', 'we': 'うぇ',
  // N
  'nn': 'ん',
  "n'": 'ん',
  // G-row
  'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
  'gya': 'ぎゃ', 'gyi': 'ぎぃ', 'gyu': 'ぎゅ', 'gye': 'ぎぇ', 'gyo': 'ぎょ',
  // Z-row
  'za': 'ざ', 'zi': 'じ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
  'ja': 'じゃ', 'ju': 'じゅ', 'je': 'じぇ', 'jo': 'じょ',
  'zya': 'じゃ', 'zyi': 'じぃ', 'zyu': 'じゅ', 'zye': 'じぇ', 'zyo': 'じょ',
  // D-row
  'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
  'dya': 'ぢゃ', 'dyi': 'ぢぃ', 'dyu': 'ぢゅ', 'dye': 'ぢぇ', 'dyo': 'ぢょ',
  // B-row
  'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
  'bya': 'びゃ', 'byi': 'びぃ', 'byu': 'びゅ', 'bye': 'びぇ', 'byo': 'びょ',
  // P-row
  'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
  'pya': 'ぴゃ', 'pyi': 'ぴぃ', 'pyu': 'ぴゅ', 'pye': 'ぴぇ', 'pyo': 'ぴょ',
  // Small vowels
  'xa': 'ぁ', 'xi': 'ぃ', 'xu': 'ぅ', 'xe': 'ぇ', 'xo': 'ぉ',
  'la': 'ぁ', 'li': 'ぃ', 'lu': 'ぅ', 'le': 'ぇ', 'lo': 'ぉ',
  'lyu': 'ゅ',
  // Small tsu
  'xtu': 'っ', 'xtsu': 'っ', 'ltu': 'っ',
  // Punctuation
  '-': 'ー',
  '.': '。',
  ',': '、',
  '?': '？',
  '!': '！',
};

// Generate Katakana map
const romajiToKatakana: Record<string, string> = {};
for (const [romaji, hiragana] of Object.entries(romajiToHiragana)) {
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

const convertSegment = (input: string, map: Record<string, string>): { result: string; pending: string } => {
  let result = '';
  let pending = input.toLowerCase();

  while (pending.length > 0) {
    let matched = false;

    // 1. Try to match longest possible key (max 4 chars usually)
    for (let len = 4; len >= 1; len--) {
      if (pending.length >= len) {
        const sub = pending.slice(0, len);
        if (map[sub]) {
          result += map[sub];
          pending = pending.slice(len);
          matched = true;
          break;
        }
      }
    }

    if (matched) continue;

    // 2. Handle double consonants (small tsu)
    if (pending.length >= 2) {
      const c1 = pending[0];
      const c2 = pending[1];
      if (c1 === c2 && 'kstnhmyrwgzbpdjfv'.includes(c1)) {
        if (c1 !== 'n') {
           result += map['xtu'] || 'っ';
           pending = pending.slice(1);
           continue;
        } else {
           // 'nn' is handled in map, but if here, it might be 'n' + 'na' -> 'ん' + 'な'
           // If map has 'nn', step 1 should catch it.
        }
      }
    }

    // 3. Handle 'n' specifically
    if (pending[0] === 'n') {
       if (pending.length === 1) {
         // Trailing 'n', keep pending if we are streaming, but here we forced conversion of segment?
         // Actually, if this function is called on "san", we want "さ" + "n".
         // BUT if we are "processInput", we might want to keep "n" as "n" until next char?
         // The new logic assumes we convert matching *prefixes*.
         // If "n" is at end, we keep it as 'n'.
         break;
       }
       const next = pending[1];
       if (!'aiueoy'.includes(next)) {
         result += map['nn'] || 'ん';
         pending = pending.slice(1);
         continue;
       }
    }

    // 4. No match
    // Check if it's a valid prefix of a longer romaji?
    // In this "segment" logic, we assume we consumed all complete matches.
    // If pending is "k", it might become "ka".
    break;
  }

  return { result, pending };
};

// Common Kanji dictionary for suggestions
export const kanjiDictionary: Record<string, Array<{ kanji: string; reading: string; meaning: string }>> = {
  // Greetings
  'こんにちは': [{ kanji: '今日は', reading: 'こんにちは', meaning: 'Xin chào' }],
  'ありがとう': [{ kanji: '有難う', reading: 'ありがとう', meaning: 'Cảm ơn' }],
  'おはよう': [{ kanji: 'お早う', reading: 'おはよう', meaning: 'Chào buổi sáng' }],
  'すみません': [{ kanji: '済みません', reading: 'すみません', meaning: 'Xin lỗi' }],
  'おねがいします': [{ kanji: 'お願いします', reading: 'おねがいします', meaning: 'Làm ơn' }],
  
  // Basic words
  'わたし': [{ kanji: '私', reading: 'わたし', meaning: 'Tôi' }],
  'あなた': [{ kanji: '貴方', reading: 'あなた', meaning: 'Bạn' }],
  'にほん': [{ kanji: '日本', reading: 'にほん', meaning: 'Nhật Bản' }],
  'がっこう': [{ kanji: '学校', reading: 'がっこう', meaning: 'Trường học' }],
  'せんせい': [{ kanji: '先生', reading: 'せんせい', meaning: 'Giáo viên' }],
  'がくせい': [{ kanji: '学生', reading: 'がくせい', meaning: 'Học sinh' }],
  
  // Verbs
  'たべる': [{ kanji: '食べる', reading: 'たべる', meaning: 'Ăn' }],
  'のむ': [{ kanji: '飲む', reading: 'のむ', meaning: 'Uống' }],
  'いく': [{ kanji: '行く', reading: 'いく', meaning: 'Đi' }],
  'くる': [{ kanji: '来る', reading: 'くる', meaning: 'Đến' }],
  'みる': [{ kanji: '見る', reading: 'みる', meaning: 'Xem' }],
  'きく': [{ kanji: '聞く', reading: 'きく', meaning: 'Nghe' }],
  'はなす': [{ kanji: '話す', reading: 'はなす', meaning: 'Nói' }],
  
  // Adjectives
  'おおきい': [{ kanji: '大きい', reading: 'おおきい', meaning: 'To' }],
  'ちいさい': [{ kanji: '小さい', reading: 'ちいさい', meaning: 'Nhỏ' }],
  'いいね': [{ kanji: '良いね', reading: 'いいね', meaning: 'Tốt nhỉ' }],
};

export const useKanaInput = () => {
  const [mode, setMode] = useState<KanaMode>('off');

  const processInput = useCallback((
    text: string, 
    cursorPos: number = text.length
  ): { text: string; cursor: number } => {
    if (mode === 'off') {
      return { text, cursor: cursorPos };
    }

    // Logic:
    // 1. Identify the meaningful "chunk" around the cursor.
    //    We only want to convert the *active* romaji sequence being typed.
    // 2. We scan backwards from cursor to find continuous non-Japanese/punctuation (likely valid romaji).
    
    // In practice, for a simple input, scanning back to last "space" or "known kana" is tricky.
    // Simplification: Scan back for [a-zA-Z-].
    
    const beforeCursor = text.slice(0, cursorPos);
    const afterCursor = text.slice(cursorPos);
    
    // Find valid romaji suffix in beforeCursor
    const match = beforeCursor.match(/[a-zA-Z\-]+$/);
    
    if (!match) {
      // Nothing to convert immediately before cursor
      return { text, cursor: cursorPos };
    }

    const romajiPart = match[0];
    const prefix = beforeCursor.slice(0, beforeCursor.length - romajiPart.length);
    
    const map = mode === 'hiragana' ? romajiToHiragana : romajiToKatakana;
    
    const { result, pending } = convertSegment(romajiPart, map);
    
    // Reconstruct
    const newDoc = prefix + result + pending + afterCursor;
    
    // Cursor position should be after the converted result + pending part
    const newCursor = prefix.length + result.length + pending.length;
    
    return { text: newDoc, cursor: newCursor };
  }, [mode]);

  const cycleMode = useCallback(() => {
    setMode(current => {
      if (current === 'off') return 'hiragana';
      if (current === 'hiragana') return 'katakana';
      return 'off';
    });
  }, []);

  const getKanjiSuggestions = useCallback((hiraganaText: string) => {
    if (!hiraganaText || hiraganaText.length < 2) return [];
    
    const suggestions: Array<{ kanji: string; reading: string; meaning: string }> = [];
    
    // Exact match
    if (kanjiDictionary[hiraganaText]) {
      suggestions.push(...kanjiDictionary[hiraganaText]);
    }
    
    // Prefix match
    for (const [reading, entries] of Object.entries(kanjiDictionary)) {
      if (reading.startsWith(hiraganaText) && reading !== hiraganaText) {
        suggestions.push(...entries);
      }
    }
    
    // Dedupe
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
    getKanjiSuggestions,
  };
};
