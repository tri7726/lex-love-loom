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
  // N
  'n': 'ん', 'nn': 'ん',
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

export const useKanaInput = () => {
  const [mode, setMode] = useState<KanaMode>('off');
  const [buffer, setBuffer] = useState('');

  const convertToKana = useCallback((input: string, kanaMode: 'hiragana' | 'katakana'): { result: string; remaining: string } => {
    const map = kanaMode === 'hiragana' ? romajiToHiragana : romajiToKatakana;
    let result = '';
    let remaining = input.toLowerCase();

    while (remaining.length > 0) {
      let matched = false;

      // Try to match double consonant (small tsu)
      if (remaining.length >= 2 && 
          remaining[0] === remaining[1] && 
          'kstfhcgzjdbp'.includes(remaining[0])) {
        result += kanaMode === 'hiragana' ? 'っ' : 'ッ';
        remaining = remaining.slice(1);
        matched = true;
        continue;
      }

      // Try to match 3, 2, 1 character sequences
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

      // Handle 'n' before non-vowel/y
      if (!matched && remaining[0] === 'n' && remaining.length === 1) {
        // Keep 'n' in buffer
        break;
      }

      if (!matched && remaining[0] === 'n' && remaining.length >= 2) {
        const next = remaining[1];
        if (!'aiueoy'.includes(next) && next !== 'n') {
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

  return {
    mode,
    setMode,
    cycleMode,
    processInput,
    resetBuffer,
    buffer,
  };
};
