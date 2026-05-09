export interface CustomKanjiInfo {
  character: string;
  meaning_vi: string;
  hanviet?: string;
  on_reading?: string;
  kun_reading?: string;
}

export interface CustomCollection {
  id: string;
  name: string;
  kanjis: CustomKanjiInfo[]; // List of kanji objects with metadata
}

export const CUSTOM_COLLECTIONS: CustomCollection[] = [
  {
    id: 'MUST_KNOW',
    name: 'Kanji "Phải Biết" 🌟',
    kanjis: [
      { character: '日', meaning_vi: 'Ngày, mặt trời', hanviet: 'NHẬT', on_reading: 'ニチ, ジツ', kun_reading: 'ひ, -び, -か' },
      { character: '月', meaning_vi: 'Tháng, mặt trăng', hanviet: 'NGUYỆT', on_reading: 'ゲツ, ガツ', kun_reading: 'つき' },
      { character: '火', meaning_vi: 'Lửa', hanviet: 'HỎA', on_reading: 'カ', kun_reading: 'ひ, -び, ほ-' },
      { character: '水', meaning_vi: 'Nước', hanviet: 'THỦY', on_reading: 'スイ', kun_reading: 'mizu' },
      { character: '木', meaning_vi: 'Cây', hanviet: 'MỘC', on_reading: 'ボク, モク', kun_reading: 'き, こ-' },
      { character: '金', meaning_vi: 'Vàng, tiền', hanviet: 'KIM', on_reading: 'キン, コン, ゴン', kun_reading: 'かな-, かね, -がね' },
      { character: '土', meaning_vi: 'Đất', hanviet: 'THỔ', on_reading: 'ド, ト', kun_reading: 'つち' },
      { character: '山', meaning_vi: 'Núi', hanviet: 'SƠN', on_reading: 'サン, セン', kun_reading: 'やま' },
      { character: '川', meaning_vi: 'Sông', hanviet: 'XUYÊN', on_reading: 'セン', kun_reading: 'かわ' },
      { character: '田', meaning_vi: 'Ruộng', hanviet: 'ĐIỀN', on_reading: 'デン', kun_reading: 'た' },
    ]
  },
  {
    id: 'ROMANTIC',
    name: 'Chủ đề Tình yêu 🌸',
    kanjis: [
      { character: '愛', meaning_vi: 'Yêu', hanviet: 'ÁI', on_reading: 'アイ', kun_reading: 'いと.しい' },
      { character: '恋', meaning_vi: 'Tình yêu (nam nữ)', hanviet: 'LUYẾN', on_reading: 'レン', kun_reading: 'こ.う, こい, こい.しい' },
      { character: '心', meaning_vi: 'Tim, lòng', hanviet: 'TÂM', on_reading: 'シン', kun_reading: 'こころ' },
      { character: '情', meaning_vi: 'Tình cảm', hanviet: 'TÌNH', on_reading: 'ジョウ, セイ', kun_reading: 'なさ.け' },
    ]
  }
];

