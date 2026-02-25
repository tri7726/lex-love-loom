export interface KanjiPoint {
  id: string;
  lesson: number;
  level: 'N5' | 'N4';
  character: string;
  meaning_vi: string;
  hanviet: string;
  on_reading: string;
  kun_reading: string;
}

export const KANJI_DB: KanjiPoint[] = [
  // Bài 1
  {
    id: 'k1-1',
    lesson: 1,
    level: 'N5',
    character: '私',
    meaning_vi: 'Tôi',
    hanviet: 'TƯ',
    on_reading: 'シ',
    kun_reading: 'わたし'
  },
  {
    id: 'k1-2',
    lesson: 1,
    level: 'N5',
    character: '人',
    meaning_vi: 'Người',
    hanviet: 'NHÂN',
    on_reading: 'ジン, ニン',
    kun_reading: 'ひと'
  },
  {
    id: 'k1-3',
    lesson: 1,
    level: 'N5',
    character: '先',
    meaning_vi: 'Trước',
    hanviet: 'TIÊN',
    on_reading: 'セン',
    kun_reading: 'さき'
  },
  {
    id: 'k1-4',
    lesson: 1,
    level: 'N5',
    character: '生',
    meaning_vi: 'Sinh, sống',
    hanviet: 'SINH',
    on_reading: 'セイ, ショウ',
    kun_reading: 'う.まれる, い.きる'
  },
  {
    id: 'k1-5',
    lesson: 1,
    level: 'N5',
    character: '学',
    meaning_vi: 'Học',
    hanviet: 'HỌC',
    on_reading: 'ガク',
    kun_reading: 'まな.ぶ'
  },
  // Bài 2
  {
    id: 'k2-1',
    lesson: 2,
    level: 'N5',
    character: '本',
    meaning_vi: 'Sách, gốc',
    hanviet: 'BẢN',
    on_reading: 'ホン',
    kun_reading: 'もと'
  },
  {
    id: 'k2-2',
    lesson: 2,
    level: 'N5',
    character: '日',
    meaning_vi: 'Ngày, mặt trời',
    hanviet: 'NHẬT',
    on_reading: 'ニチ, ジツ',
    kun_reading: 'ひ, -か'
  },
  {
    id: 'k2-3',
    lesson: 2,
    level: 'N5',
    character: '何',
    meaning_vi: 'Cái gì',
    hanviet: 'HÀ',
    on_reading: 'カ',
    kun_reading: 'なに, なん'
  },
  // Bài 3
  {
    id: 'k3-1',
    lesson: 3,
    level: 'N5',
    character: '大',
    meaning_vi: 'Lớn',
    hanviet: 'ĐẠI',
    on_reading: 'ダイ, タイ',
    kun_reading: 'おお.きい'
  },
  {
    id: 'k3-2',
    lesson: 3,
    level: 'N5',
    character: '学',
    meaning_vi: 'Học',
    hanviet: 'HỌC',
    on_reading: 'ガク',
    kun_reading: 'まな.ぶ'
  },
  // Bài 4
  {
    id: 'k4-1',
    lesson: 4,
    level: 'N5',
    character: '時',
    meaning_vi: 'Thời gian, giờ',
    hanviet: 'THỜI',
    on_reading: 'ジ',
    kun_reading: 'とき'
  },
  {
    id: 'k4-2',
    lesson: 4,
    level: 'N5',
    character: '分',
    meaning_vi: 'Phút, hiểu, chia',
    hanviet: 'PHÂN',
    on_reading: 'フン, ブン, ブ',
    kun_reading: 'わ.かる, わ.ける'
  },
  {
    id: 'k4-3',
    lesson: 4,
    level: 'N5',
    character: '半',
    meaning_vi: 'Bán (một nửa)',
    hanviet: 'BÁN',
    on_reading: 'ハン',
    kun_reading: 'なか.ば'
  },
  // Bài 5
  {
    id: 'k5-1',
    lesson: 5,
    level: 'N5',
    character: '行',
    meaning_vi: 'Đi, tổ chức',
    hanviet: 'HÀNH',
    on_reading: 'コウ, ギョウ',
    kun_reading: 'い.く, おこな.う'
  },
  {
    id: 'k5-2',
    lesson: 5,
    level: 'N5',
    character: '来',
    meaning_vi: 'Đến',
    hanviet: 'LAI',
    on_reading: 'ライ',
    kun_reading: 'く.る'
  },
  {
    id: 'k5-3',
    lesson: 5,
    level: 'N5',
    character: '車',
    meaning_vi: 'Xe ô tô',
    hanviet: 'XA',
    on_reading: 'シャ',
    kun_reading: 'くるま'
  },
  // Bài 26
  {
    id: 'k26-1',
    lesson: 26,
    level: 'N4',
    character: '受',
    meaning_vi: 'Nhận',
    hanviet: 'THỤ',
    on_reading: 'ジュ',
    kun_reading: 'う.ける'
  },
  {
    id: 'k26-2',
    lesson: 26,
    level: 'N4',
    character: '取',
    meaning_vi: 'Lấy, cầm',
    hanviet: 'THỦ',
    on_reading: 'シュ',
    kun_reading: 'と.る'
  },
  // Bài 27
  {
    id: 'k27-1',
    lesson: 27,
    level: 'N4',
    character: '建',
    meaning_vi: 'Xây dựng',
    hanviet: 'KIẾN',
    on_reading: 'ケン',
    kun_reading: 'た.てる'
  },
  {
    id: 'k27-2',
    lesson: 27,
    level: 'N4',
    character: '走',
    meaning_vi: 'Chạy',
    hanviet: 'TẨU',
    on_reading: 'ソウ',
    kun_reading: 'はし.る'
  },
  // Bài 28
  {
    id: 'k28-1',
    lesson: 28,
    level: 'N4',
    character: '選',
    meaning_vi: 'Chọn',
    hanviet: 'TUYỂN',
    on_reading: 'セン',
    kun_reading: 'えら.ぶ'
  },
  // Bài 29
  {
    id: 'k29-1',
    lesson: 29,
    level: 'N4',
    character: '開',
    meaning_vi: 'Mở',
    hanviet: 'KHAI',
    on_reading: 'カイ',
    kun_reading: 'あ.ける, ひら.く'
  },
  {
    id: 'k29-2',
    lesson: 29,
    level: 'N4',
    character: '閉',
    meaning_vi: 'Đóng',
    hanviet: 'BẾ',
    on_reading: 'ヘイ',
    kun_reading: 'し.める, と.じる'
  },
  // Bài 30
  {
    id: 'k30-1',
    lesson: 30,
    level: 'N4',
    character: '置',
    meaning_vi: 'Đặt, để',
    hanviet: 'TRÍ',
    on_reading: 'チ',
    kun_reading: 'お.く'
  },
  // Bài 31
  {
    id: 'k31-1',
    lesson: 31,
    level: 'N4',
    character: '決',
    meaning_vi: 'Quyết định',
    hanviet: 'QUYẾT',
    on_reading: 'ケツ',
    kun_reading: 'き.める'
  },
  // Bài 32
  {
    id: 'k32-1',
    lesson: 32,
    level: 'N4',
    character: '婚',
    meaning_vi: 'Hôn nhân',
    hanviet: 'HÔN',
    on_reading: 'コン',
    kun_reading: ''
  },
  // Bài 33
  {
    id: 'k33-1',
    lesson: 33,
    level: 'N4',
    character: '伝',
    meaning_vi: 'Truyền',
    hanviet: 'TRUYỀN',
    on_reading: 'デン',
    kun_reading: 'つた.える'
  },
  // Bài 34
  {
    id: 'k34-1',
    lesson: 34,
    level: 'N4',
    character: '通',
    meaning_vi: 'Thông qua',
    hanviet: 'THÔNG',
    on_reading: 'ツウ',
    kun_reading: 'とお.る, かよ.う'
  },
  // Bài 35
  {
    id: 'k35-1',
    lesson: 35,
    level: 'N4',
    character: '波',
    meaning_vi: 'Sóng',
    hanviet: 'BA',
    on_reading: 'ハ',
    kun_reading: 'なみ'
  },
  // Bài 36
  {
    id: 'k36-1',
    lesson: 36,
    level: 'N4',
    character: '慣',
    meaning_vi: 'Quen',
    hanviet: 'QUÁN',
    on_reading: 'カン',
    kun_reading: 'な.れる'
  },
  // Bài 37
  {
    id: 'k37-1',
    lesson: 37,
    level: 'N4',
    character: '投',
    meaning_vi: 'Ném',
    hanviet: 'ĐẦU',
    on_reading: 'トウ',
    kun_reading: 'な.げる'
  },
  // Bài 38
  {
    id: 'k38-1',
    lesson: 38,
    level: 'N4',
    character: '育',
    meaning_vi: 'Nuôi, lớn',
    hanviet: 'DỤC',
    on_reading: 'イク',
    kun_reading: 'そだ.つ'
  },
  // Bài 39
  {
    id: 'k39-1',
    lesson: 39,
    level: 'N4',
    character: '亡',
    meaning_vi: 'Mất, chết',
    hanviet: 'VONG',
    on_reading: 'ボウ',
    kun_reading: 'な.くなる'
  },
  // Bài 40
  {
    id: 'k40-1',
    lesson: 40,
    level: 'N4',
    character: '数',
    meaning_vi: 'Số',
    hanviet: 'SỐ',
    on_reading: 'スウ',
    kun_reading: 'かず, かぞ.える'
  },
  // Bài 41
  {
    id: 'k41-1',
    lesson: 41,
    level: 'N4',
    character: '払',
    meaning_vi: 'Trả (tiền)',
    hanviet: 'PHẤT',
    on_reading: 'ヒツ',
    kun_reading: 'はら.う'
  },
  // Bài 42
  {
    id: 'k42-1',
    lesson: 42,
    level: 'N4',
    character: '量',
    meaning_vi: 'Lượng',
    hanviet: 'LƯỢNG',
    on_reading: 'リョウ',
    kun_reading: 'はか.る'
  },
  // Bài 43
  {
    id: 'k43-1',
    lesson: 43,
    level: 'N4',
    character: '呼',
    meaning_vi: 'Gọi',
    hanviet: 'HÔ',
    on_reading: 'コ',
    kun_reading: 'よ.ぶ'
  },
  // Bài 44
  {
    id: 'k44-1',
    lesson: 44,
    level: 'N4',
    character: '泣',
    meaning_vi: 'Khóc',
    hanviet: 'KHẤP',
    on_reading: 'キュウ',
    kun_reading: 'な.く'
  },
  // Bài 45
  {
    id: 'k45-1',
    lesson: 45,
    level: 'N4',
    character: '笑',
    meaning_vi: 'Cười',
    hanviet: 'TIẾU',
    on_reading: 'ショウ',
    kun_reading: 'わら.う'
  },
  // Bài 46
  {
    id: 'k46-1',
    lesson: 46,
    level: 'N4',
    character: '乾',
    meaning_vi: 'Khô',
    hanviet: 'CAN',
    on_reading: 'カン',
    kun_reading: 'かわ.く'
  },
  // Bài 47
  {
    id: 'k47-1',
    lesson: 47,
    level: 'N4',
    character: '配',
    meaning_vi: 'Phân phối',
    hanviet: 'PHỐI',
    on_reading: 'ハイ',
    kun_reading: 'くば.る'
  },
  // Bài 48
  {
    id: 'k48-1',
    lesson: 48,
    level: 'N4',
    character: '届',
    meaning_vi: 'Đưa đến',
    hanviet: 'GIỚI',
    on_reading: 'カイ',
    kun_reading: 'とど.ける'
  },
  // Bài 49
  {
    id: 'k49-1',
    lesson: 49,
    level: 'N4',
    character: '招',
    meaning_vi: 'Mời',
    hanviet: 'CHIÊU',
    on_reading: 'ショウ',
    kun_reading: 'まね.く'
  },
  // Bài 50
  {
    id: 'k50-1',
    lesson: 50,
    level: 'N4',
    character: '願',
    meaning_vi: 'Cầu nguyện',
    hanviet: 'NGUYỆN',
    on_reading: 'ガン',
    kun_reading: 'ねが.う'
  },
];
