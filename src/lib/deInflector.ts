/**
 * De-inflector Engine — P1 của Local Dictionary Engine
 * Chuyển dạng chia về từ gốc để tra từ điển local.
 *
 * Ví dụ:
 *   deInflect("食べなかった") → ["食べなかった", "食べる"]
 *   deInflect("高くない")    → ["高くない", "高い"]
 *   deInflect("先生")        → ["先生"]  (không match rule nào → trả về chính nó)
 */

/** [suffix_cần_xóa, suffix_thay_thế, ghi_chú] */
type InflectionRule = readonly [string, string, string];

const RULES: InflectionRule[] = [
  // ─── Động từ Nhóm 2 (ichidan – phần lớn kết thúc bằng る) ───
  ['なかった', 'る', 'v2-past-neg'],        // 食べなかった → 食べる
  ['ませんでした', 'ます', 'v-masu-past-neg'],// 食べませんでした → 食べます
  ['ました', 'ます', 'v-masu-past'],         // 食べました → 食べます
  ['ません', 'ます', 'v-masu-neg'],          // 食べません → 食べます
  ['ています', 'る', 'v2-te-iru'],           // 食べています → 食べる
  ['ていない', 'る', 'v2-te-iru-neg'],       // 食べていない → 食べる
  ['てみる', 'る', 'v2-te-miru'],            // 食べてみる → 食べる
  ['てください', 'る', 'v2-te-req'],         // 食べてください → 食べる
  ['てから', 'る', 'v2-te-kara'],            // 食べてから → 食べる
  ['られる', 'る', 'v2-passive'],            // 食べられる → 食べる
  ['させる', 'る', 'v2-causative'],          // 食べさせる → 食べる
  ['させられる', 'る', 'v2-causative-pass'], // 食べさせられる → 食べる
  ['れば', 'る', 'v2-conditional'],          // 食べれば → 食べる
  ['ないで', 'る', 'v2-neg-de'],             // 食べないで → 食べる
  ['ない', 'る', 'v2-neg'],                  // 食べない → 食べる (phải sau các rule trên)

  // ─── Động từ Nhóm 1 (godan – dạng ます) ───
  ['います', 'う', 'v1-i-masu'],
  ['きます', 'く', 'v1-ki-masu'],
  ['ぎます', 'ぐ', 'v1-gi-masu'],
  ['します', 'す', 'v1-si-masu'],
  ['ちます', 'つ', 'v1-chi-masu'],
  ['にます', 'ぬ', 'v1-ni-masu'],
  ['びます', 'ぶ', 'v1-bi-masu'],
  ['みます', 'む', 'v1-mi-masu'],
  ['ります', 'る', 'v1-ri-masu'],

  // ─── Động từ Nhóm 1 – thể て ───
  ['いて', 'く', 'v1-i-te'],   // 書いて → 書く
  ['いだ', 'ぐ', 'v1-i-da'],   // 泳いだ → 泳ぐ
  ['って', 'う', 'v1-tte'],    // 買って → 買う (cũng có つ, る)
  ['んで', 'ぬ', 'v1-nde'],    // 死んで → 死ぬ (cũng có む, ぶ)
  ['して', 'す', 'v1-site'],   // 話して → 話す

  // ─── Tính từ い (i-adjective) ───
  ['くなかった', 'い', 'adj-i-past-neg'], // 高くなかった → 高い
  ['くない', 'い', 'adj-i-neg'],          // 高くない → 高い
  ['かった', 'い', 'adj-i-past'],         // 高かった → 高い
  ['くて', 'い', 'adj-i-te'],             // 高くて → 高い
  ['ければ', 'い', 'adj-i-cond'],         // 高ければ → 高い
  ['く', 'い', 'adj-i-adv'],              // 高く → 高い (phải ở cuối)

  // ─── Tính từ な (na-adjective) ───
  ['ではない', '', 'adj-na-neg'],   // 静かではない → 静か
  ['じゃない', '', 'adj-na-neg'],   // 静かじゃない → 静か
  ['だった', '', 'adj-na-past'],    // 静かだった → 静か
  ['で', '', 'adj-na-te'],          // 静かで → 静か (cẩn thận, có thể false positive)
] as const;

/**
 * Trả về danh sách các dạng gốc khả dĩ từ một từ đã chia.
 * Luôn bao gồm từ gốc (chính tả gốc) làm phần tử đầu tiên.
 */
export function deInflect(word: string): string[] {
  if (!word || word.length === 0) return [];

  const candidates = new Set<string>([word]);

  for (const [suffix, replacement] of RULES) {
    if (word.length > suffix.length && word.endsWith(suffix)) {
      const root = word.slice(0, word.length - suffix.length) + replacement;
      if (root.length > 0) {
        candidates.add(root);
      }
    }
  }

  return [...candidates];
}

/**
 * Kiểm tra nhanh xem chuỗi có chứa ký tự tiếng Nhật không.
 * Dùng để filter trước khi chạy deInflect.
 */
export function isJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
}
