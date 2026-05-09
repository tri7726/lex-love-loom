export interface GrammarPoint {
  id: string;
  lesson: number;
  level: 'N5' | 'N4' | 'N3';
  title: string;
  usage: string;
  explanation: string;
  example: string;
  translation: string;
  category: string;
  related?: string[];
  pitfall?: string;
}

export const GRAMMAR_DB: GrammarPoint[] = [
  // ==================== N5 ====================
  // Bài 1
  {
    id: 'g1-1', lesson: 1, level: 'N5',
    title: '~ は ~ です',
    usage: 'N1 は N2 です',
    explanation: 'Khẳng định N1 là N2. は là trợ từ chủ ngữ, です kết thúc câu lịch sự.',
    example: '私はマイです。(Watashi wa Mai desu - Tôi là Mai.)',
    translation: 'Tôi là Mai.',
    category: 'Cấu trúc cơ bản'
  },
  {
    id: 'g1-2', lesson: 1, level: 'N5',
    title: '~ は ~ じゃありません',
    usage: 'N1 は N2 じゃありません',
    explanation: 'Phủ định của です. Có thể dùng では ありません trong văn viết.',
    example: 'サントスさんは学生じゃありません。(Santosu-san wa gakusei ja arimasen - Anh Santos không phải là sinh viên.)',
    translation: 'Anh Santos không phải là sinh viên.',
    category: 'Cấu trúc cơ bản',
    pitfall: 'Dễ nhầm じゃありません với ではありません (khác biệt về mức độ trang trọng)'
  },
  {
    id: 'g1-3', lesson: 1, level: 'N5',
    title: '~ は ~ ですか',
    usage: 'N1 は N2 ですか',
    explanation: 'Câu nghi vấn (câu hỏi). Thêm か vào cuối câu để tạo câu hỏi.',
    example: 'ミラーさんは会社員ですか。(Miraa-san wa kaishain desuka - Anh Miller là nhân viên công ty phải không?)',
    translation: 'Anh Miller là nhân viên công ty phải không?',
    category: 'Câu nghi vấn'
  },
  {
    id: 'g1-4', lesson: 1, level: 'N5',
    title: '~ も',
    usage: 'N1 も N2 です',
    explanation: 'Trợ từ も (cũng). Dùng thay cho は khi đối tượng có cùng đặc điểm với đối tượng trước đó.',
    example: '私も会社員です。(Watashi mo kaishain desu - Tôi cũng là nhân viên công ty.)',
    translation: 'Tôi cũng là nhân viên công ty.',
    category: 'Trợ từ',
    related: ['g1-1']
  },
  {
    id: 'g1-5', lesson: 1, level: 'N5',
    title: 'N1 の N2',
    usage: 'N1 の N2',
    explanation: 'Trợ từ の dùng để nối 2 danh từ. N1 bổ nghĩa cho N2 (sở hữu, thuộc về, nội dung).',
    example: 'ミラーさんは IMC の社員です。(Miraa-san wa IMC no shain desu - Anh Miller là nhân viên của công ty IMC.)',
    translation: 'Anh Miller là nhân viên của công ty IMC.',
    category: 'Trợ từ'
  },
  // Bài 2
  {
    id: 'g2-1', lesson: 2, level: 'N5',
    title: 'これ / それ / あれ',
    usage: 'これ/それ/あれ は N です',
    explanation: 'Đại từ chỉ định vật. これ (này), それ (đó), あれ (kia).',
    example: 'これは辞書です。(Kore wa jisho desu - Đây là từ điển.)',
    translation: 'Đây là từ điển.',
    category: 'Đại từ'
  },
  {
    id: 'g2-2', lesson: 2, level: 'N5',
    title: 'この / その / あの',
    usage: 'この/その/あの N は ~ です',
    explanation: 'Tính từ chỉ định. Phải có danh từ đi kèm ngay sau đó.',
    example: 'この本は私のです。(Kono hon wa watashi no desu - Cuốn sách này là của tôi.)',
    translation: 'Cuốn sách này là của tôi.',
    category: 'Đại từ',
    related: ['g2-1']
  },
  {
    id: 'g2-3', lesson: 2, level: 'N5',
    title: 'そうです / そうじゃありません',
    usage: 'はい、そうです / いいえ、そうじゃありません',
    explanation: 'Cách trả lời câu hỏi nghi vấn danh từ.',
    example: 'それはテレホンカードですか。…はい、そうです。(Sore wa terehon kaado desuka. ...Hai, sou desu - Đó là thẻ điện thoại phải không? ...Vâng, đúng vậy.)',
    translation: 'Đó là thẻ điện thoại phải không? ...Vâng, đúng vậy.',
    category: 'Cách trả lời',
    related: ['g1-3']
  },
  // Bài 3
  {
    id: 'g3-1', lesson: 3, level: 'N5',
    title: 'ここ / そこ / あそこ',
    usage: 'ここ/そこ/あそこ は N (địa điểm) です',
    explanation: 'Đại từ chỉ địa điểm. ここ (đây), そこ (đó), あそこ (kia).',
    example: 'ここは食堂です。(Koko wa shokudou desu - Đây là nhà ăn.)',
    translation: 'Đây là nhà ăn.',
    category: 'Địa điểm'
  },
  {
    id: 'g3-2', lesson: 3, level: 'N5',
    title: 'こちら / そちら / あちら / どちら',
    usage: 'こちら/そちら/あちら は N です',
    explanation: 'Hướng hoặc địa điểm (cách nói lịch sự). どちら dùng để hỏi.',
    example: 'お手洗いはどちらですか。…あちらです。(Otearai wa dochira desuka. ...Achira desu - Nhà vệ sinh ở phía nào? ...Phía kia ạ.)',
    translation: 'Nhà vệ sinh ở phía nào? ...Phía kia ạ.',
    category: 'Lịch sự'
  },
  // Bài 4
  {
    id: 'g4-1', lesson: 4, level: 'N5',
    title: 'Động từ ます / ません / ました / ませんでした',
    usage: 'V ます/ません/ました/ませんでした',
    explanation: 'Các dạng thời và khẳng định/phủ định của động từ lịch sự.',
    example: '毎朝 6 時に起きます。(Maiasa rokuji ni okimasu - Mỗi sáng tôi dậy lúc 6 giờ.)',
    translation: 'Mỗi sáng tôi dậy lúc 6 giờ.',
    category: 'Động từ'
  },
  {
    id: 'g4-2', lesson: 4, level: 'N5',
    title: 'N (thời gian) に V',
    usage: 'N (thời gian) に V',
    explanation: 'Trợ từ に đi sau danh từ chỉ thời gian cụ thể (có số).',
    example: '10 時半に寝ます。(Juujihan ni nemasu - Tôi ngủ lúc 10 giờ rưỡi.)',
    translation: 'Tôi ngủ lúc 10 giờ rưỡi.',
    category: 'Trợ từ',
    related: ['g4-1'],
    pitfall: 'に không dùng với thời gian tương đối (今、毎日、来年)'
  },
  // Bài 5
  {
    id: 'g5-1', lesson: 5, level: 'N5',
    title: 'N (địa điểm) へ いきます / きます / かえります',
    usage: 'N (địa điểm) へ いきます/きます/かえります',
    explanation: 'Trợ từ へ chỉ hướng di chuyển.',
    example: '京都へ行きます。(Kyouto e ikimasu - Tôi đi Kyoto.)',
    translation: 'Tôi đi Kyoto.',
    category: 'Di chuyển'
  },
  {
    id: 'g5-2', lesson: 5, level: 'N5',
    title: 'N (phương tiện) で いきます / きます / かえります',
    usage: 'N (phương tiện) で V',
    explanation: 'Trợ từ で chỉ phương tiện giao thông.',
    example: '電車で行きます。(Densha de ikimasu - Tôi đi bằng tàu điện.)',
    translation: 'Tôi đi bằng tàu điện.',
    category: 'Trợ từ',
    related: ['g5-1']
  },
  // ==================== N4 ====================
  // Bài 26
  {
    id: 'g26-1', lesson: 26, level: 'N4',
    title: '～んです',
    usage: 'V/A/N (thể thông thường) + んです',
    explanation: 'Dùng để nhấn mạnh ý nghĩa, giải thích lý do, hoặc yêu cầu giải thích.',
    example: '明日から旅行なんです。(Ashita kara ryokou nandesu - Từ ngày mai tôi sẽ đi du lịch.)',
    translation: 'Từ ngày mai tôi sẽ đi du lịch.',
    category: 'Cấu trúc nhấn mạnh',
    pitfall: 'Dễ nhầm んです với のです (んです là dạng nói thân mật hơn của のです)'
  },
  {
    id: 'g26-2', lesson: 26, level: 'N4',
    title: 'Vていただけませんか',
    usage: 'Vて + いただけませんか',
    explanation: 'Yêu cầu, nhờ vả ai đó làm gì một cách lịch sự.',
    example: '書き方を教えていただけませんか。(Kakikata o oshiete itadakemasenka - Anh/Chị có thể dạy tôi cách viết không?)',
    translation: 'Anh/Chị có thể dạy tôi cách viết không?',
    category: 'Cấu trúc yêu cầu'
  },
  {
    id: 'g26-3', lesson: 26, level: 'N4',
    title: 'Từ để hỏi + Vたら いいですか',
    usage: 'Từ để hỏi + Vたら いいですか',
    explanation: 'Dùng khi muốn xin lời khuyên hoặc chỉ dẫn.',
    example: 'どこでカメラを買ったらいいですか。(Doko de kamera o kattara ii desuka - Tôi nên mua máy ảnh ở đâu?)',
    translation: 'Tôi nên mua máy ảnh ở đâu?',
    category: 'Cấu trúc lời khuyên'
  },
  // Bài 27
  {
    id: 'g27-1', lesson: 27, level: 'N4',
    title: 'Động từ khả năng',
    usage: 'Nhóm 1: i -> e masu; Nhóm 2: + raremasu; Nhóm 3: kimasu -> koraremasu, shimasu -> dekimasu',
    explanation: 'Diễn tả khả năng con người hoặc điều kiện cho phép.',
    example: '私は日本語が話せます。(Watashi wa Nihongo ga hanasemasu - Tôi có thể nói tiếng Nhật.)',
    translation: 'Tôi có thể nói tiếng Nhật.',
    category: 'Thể khả năng'
  },
  {
    id: 'g27-2', lesson: 27, level: 'N4',
    title: 'みえます / きこえます',
    usage: 'N が みえます/きこえます',
    explanation: 'Nhìn thấy / nghe thấy một cách tự nhiên (không có ý chí).',
    example: '窓から山が見えます。(Mado kara yama ga miemasu - Từ cửa sổ có thể nhìn thấy núi.)',
    translation: 'Từ cửa sổ có thể nhìn thấy núi.',
    category: 'Thể khả năng',
    related: ['g27-1']
  },
  {
    id: 'g27-3', lesson: 27, level: 'N4',
    title: 'しか',
    usage: 'N しか V ません',
    explanation: 'Chỉ... (đi kèm với phủ định), nhấn mạnh sự ít ỏi.',
    example: 'ローマ字しか書けません。(Roomaji shika kakemasen - Tôi chỉ có thể viết được chữ La Mã.)',
    translation: 'Tôi chỉ có thể viết được chữ La Mã.',
    category: 'Trợ từ',
    pitfall: 'Dễ nhầm しか〜ない với だけ (しか mang sắc thái "ít quá, đáng tiếc")'
  },
  // Bài 28
  {
    id: 'g28-1', lesson: 28, level: 'N4',
    title: 'Vながら',
    usage: 'V1 (bỏ masu) ながら V2',
    explanation: 'Vừa làm V1 vừa làm V2 (V2 là hành động chính).',
    example: '音楽を聞きながら食事します。(Ongaku o kikinagara shokuji shimasu - Tôi vừa nghe nhạc vừa ăn cơm.)',
    translation: 'Tôi vừa nghe nhạc vừa ăn cơm.',
    category: 'Hành động song song'
  },
  {
    id: 'g28-2', lesson: 28, level: 'N4',
    title: 'Vています (Duy trì)',
    usage: 'Vて います',
    explanation: 'Diễn tả một thói quen hoặc một trạng thái lặp đi lặp lại.',
    example: '毎朝ジョギングをしています。(Maiasa jogingu o shite imasu - Mỗi sáng tôi đều chạy bộ.)',
    translation: 'Mỗi sáng tôi đều chạy bộ.',
    category: 'Trạng thái',
    related: ['g29-2']
  },
  {
    id: 'g28-3', lesson: 28, level: 'N4',
    title: '～し、～し',
    usage: 'V/A/N (thể thông thường) し、～',
    explanation: 'Dùng để liệt kê lý do, nguyên nhân hoặc các đặc điểm.',
    example: '駅から近いし、車でも来られるし、この店は便利です。(Eki kara chikaishi, kuruma demo korarerushi, kono mise wa benri desu - Vì gần nhà ga, lại có thể đi bằng ô tô nên cửa hàng này rất tiện lợi.)',
    translation: 'Vì gần nhà ga, lại có thể đi bằng ô tô nên cửa hàng này rất tiện lợi.',
    category: 'Liên từ'
  },
  // Bài 29
  {
    id: 'g29-1', lesson: 29, level: 'N4',
    title: 'Vてしまいます',
    usage: 'Vて しまいます/しまいました',
    explanation: 'Diễn tả sự hoàn thành của hành động hoặc sự hối tiếc về một việc đã xảy ra.',
    example: '宿題を忘れてしまいました。(Shukudai o wasurete shimaimashita - Tôi lỡ quên bài tập mất rồi.)',
    translation: 'Tôi lỡ quên bài tập mất rồi.',
    category: 'Trạng thái/Cảm xúc',
    pitfall: 'しまう trong văn nói thường rút gọn thành ちゃう (忘れちゃった)'
  },
  {
    id: 'g29-2', lesson: 29, level: 'N4',
    title: 'Vています (Trạng thái kết quả)',
    usage: 'N が Vて います',
    explanation: 'Diễn tả trạng thái là kết quả của một hành động đã xảy ra (thường dùng tự động từ).',
    example: '窓が閉まっています。(Mado ga shimatte imasu - Cửa sổ đang đóng.)',
    translation: 'Cửa sổ đang đóng.',
    category: 'Trạng thái',
    related: ['g28-2', 'g30-1'],
    pitfall: 'Phân biệt với Vています (tiếp diễn) — 閉めています là "đang đóng" (hành động), 閉まっています là "đã đóng" (trạng thái)'
  },
  // Bài 30
  {
    id: 'g30-1', lesson: 30, level: 'N4',
    title: 'Vてあります',
    usage: 'N が Vて あります',
    explanation: 'Diễn tả trạng thái là kết quả của một hành động có mục đích của ai đó (thường dùng tha động từ).',
    example: '壁にカレンダーが掛けてあります。(Kabe ni karendaa ga kakete arimasu - Trên tường có treo cái lịch.)',
    translation: 'Trên tường có treo cái lịch.',
    category: 'Trạng thái',
    related: ['g29-2']
  },
  {
    id: 'g30-2', lesson: 30, level: 'N4',
    title: 'Vておきます',
    usage: 'Vて おきます',
    explanation: 'Chuẩn bị sẵn một việc gì đó, hoặc giữ nguyên một trạng thái.',
    example: '旅行の前に切符を買っておきます。(Ryokou no mae ni kippu o katte okimasu - Trước khi đi du lịch tôi sẽ mua vé sẵn.)',
    translation: 'Trước khi đi du lịch tôi sẽ mua vé sẵn.',
    category: 'Chuẩn bị'
  },
  // Bài 31
  {
    id: 'g31-1', lesson: 31, level: 'N4',
    title: 'Thể ý định (V-ou)',
    usage: 'Nhóm 1: i -> o u; Nhóm 2: + you; Nhóm 3: kimasu -> koyou, shimasu -> shiyou',
    explanation: 'Dùng trong văn thân mật hoặc để diễn tả dự định.',
    example: 'ちょっと休もう。(Chotto yasumou - Nghỉ một lát nào.)',
    translation: 'Nghỉ một lát nào.',
    category: 'Thể ý định'
  },
  {
    id: 'g31-2', lesson: 31, level: 'N4',
    title: 'Vおうと思っています',
    usage: 'Vおう と思っています',
    explanation: 'Diễn tả một ý định đã được hình thành từ trước và vẫn đang duy trì.',
    example: '週末は海へ行こうと思っています。(Shuumatsu wa umi e ikou to omotte imasu - Tôi đang định cuối tuần đi biển.)',
    translation: 'Tôi đang định cuối tuần đi biển.',
    category: 'Ý định',
    related: ['g31-1', 'g31-3']
  },
  {
    id: 'g31-3', lesson: 31, level: 'N4',
    title: 'Vる / Vない つもりです',
    usage: 'Vる / Vない つもりです',
    explanation: 'Quyết định, dự định làm (hoặc không làm) một việc gì đó.',
    example: '来年結婚するつもりです。(Rainen kekkon suru tsumori desu - Sang năm tôi định kết hôn.)',
    translation: 'Sang năm tôi định kết hôn.',
    category: 'Ý định',
    related: ['g31-2']
  },
  // Bài 32
  {
    id: 'g32-1', lesson: 32, level: 'N4',
    title: 'Vたほうがいい / Vないほうがいい',
    usage: 'Vた/Vない ほうがいいです',
    explanation: 'Lời khuyên nên hoặc không nên làm gì.',
    example: '毎日運動したほうがいいですよ。(Mainichi undou shita houga ii desu yo - Anh/Chị nên vận động mỗi ngày.)',
    translation: 'Anh/Chị nên vận động mỗi ngày.',
    category: 'Lời khuyên'
  },
  {
    id: 'g32-2', lesson: 32, level: 'N4',
    title: '～でしょう / ～かもしれません',
    usage: 'V/A/N (thông thường) + でしょう/かもしれません',
    explanation: 'Dự đoán (でしょう: 70-80% chắc chắn, かもしれません: 50%).',
    example: '明日は雨が降るかもしれません。(Ashita wa ame ga furu kamo shiremasen - Ngày mai có lẽ trời sẽ mưa.)',
    translation: 'Ngày mai có lẽ trời sẽ mưa.',
    category: 'Dự đoán',
    related: ['g43-1', 'g47-2']
  },
  // Bài 33
  {
    id: 'g33-1', lesson: 33, level: 'N4',
    title: 'Thể mệnh lệnh và cấm đoán',
    usage: 'Mệnh lệnh: Nhóm 1 (i->e), Nhóm 2 (+ro). Cấm đoán: Vるな',
    explanation: 'Dùng để ra lệnh hoặc cấm đoán (thường dùng bởi nam giới hoặc trong trường hợp khẩn cấp).',
    example: '早く寝ろ！(Hayaku nero! - Ngủ mau!); 触るな！(Sawaru na! - Cấm sờ!)',
    translation: 'Ngủ mau!; Cấm sờ!',
    category: 'Cấu trúc mệnh lệnh',
    pitfall: 'Dạng なさい (mệnh lệnh nhẹ nhàng hơn) — so sánh 寝ろ！và 寝なさい'
  },
  {
    id: 'g33-2', lesson: 33, level: 'N4',
    title: '～と言っていました',
    usage: 'Ai đó + は ～と言っていました',
    explanation: 'Trình bày lại lời nhắn của một người khác.',
    example: '田中さんは明日休むと言っていました。(Tanaka-san wa ashita yasumu to itte imashita - Anh Tanaka nói là ngày mai anh ấy nghỉ.)',
    translation: 'Anh Tanaka nói là ngày mai anh ấy nghỉ.',
    category: 'Trích dẫn',
    related: ['g47-1']
  },
  // Bài 34
  {
    id: 'g34-1', lesson: 34, level: 'N4',
    title: 'Vた / Nの とおりに',
    usage: 'Vた/Nの とおりに',
    explanation: 'Làm việc gì đó theo đúng như những gì đã thấy, đã nghe hoặc theo chỉ dẫn.',
    example: '私がやったとおりに、やってください。(Watashi ga yatta toori ni, yatte kudasai - Hãy làm theo đúng như tôi đã làm.)',
    translation: 'Hãy làm theo đúng như tôi đã làm.',
    category: 'Chỉ dẫn'
  },
  {
    id: 'g34-2', lesson: 34, level: 'N4',
    title: 'Vた / Nの あとで',
    usage: 'Vた/Nの あとで',
    explanation: 'Sau khi làm việc A, làm việc B.',
    example: '仕事のあとで、飲みに行きませんか。(Shigoto no ato de, nomi ni ikimasenka - Sau giờ làm đi uống chút không?)',
    translation: 'Sau giờ làm đi uống chút không?',
    category: 'Thời gian'
  },
  // Bài 35
  {
    id: 'g35-1', lesson: 35, level: 'N4',
    title: 'Thể điều kiện (V-eba)',
    usage: 'V (i -> e ba), A (i -> kereba), N (nara ba)',
    explanation: 'Giả định một điều kiện nào đó.',
    example: '安ければ、買います。(Yasukereba, kaimasu - Nếu rẻ tôi sẽ mua.)',
    translation: 'Nếu rẻ tôi sẽ mua.',
    category: 'Điều kiện',
    pitfall: 'Đừng nhầm với Vたら (điều kiện hoàn thành) — Vば dùng cho giả định chung, Vたら dùng cho kết quả cụ thể sau khi hoàn thành'
  },
  {
    id: 'g35-2', lesson: 35, level: 'N4',
    title: 'Vえば Vるほど',
    usage: 'Vえば Vるほど',
    explanation: 'Càng... càng...',
    example: '日本語は勉強すればするほど面白いです。(Nihongo wa benkyou sureba suru hodo omoshiroi desu - Tiếng Nhật càng học càng thấy thú vị.)',
    translation: 'Tiếng Nhật càng học càng thấy thú vị.',
    category: 'So sánh lũy tiến'
  },
  // Bài 36
  {
    id: 'g36-1', lesson: 36, level: 'N4',
    title: 'Vる / Vない ように',
    usage: 'Vる/Vない ように (hành động)',
    explanation: 'Để đạt được mục đích (thường đi với động từ khả năng hoặc tự động từ).',
    example: '忘れないように、メモします。(Wasurenai youni, memo shimasu - Để không quên, tôi sẽ ghi chú lại.)',
    translation: 'Để không quên, tôi sẽ ghi chú lại.',
    category: 'Mục đích',
    related: ['g36-2'],
    pitfall: 'Phân biệt 〜ように (mục đích) với 〜ために (mục đích) — ように dùng với động từ không ý chí/khả năng, ために dùng với ý chí'
  },
  {
    id: 'g36-2', lesson: 36, level: 'N4',
    title: 'Vる ように なります',
    usage: 'Vる ように なります',
    explanation: 'Biểu thị sự thay đổi trạng thái (trở nên có thể làm gì đó).',
    example: '日本語が話せるようになりました。(Nihongo ga hanaseru youni narimashita - Tôi đã có thể nói được tiếng Nhật rồi.)',
    translation: 'Tôi đã có thể nói được tiếng Nhật rồi.',
    category: 'Thay đổi',
    related: ['g36-1']
  },
  // Bài 37
  {
    id: 'g37-1', lesson: 37, level: 'N4',
    title: 'Thể bị động',
    usage: 'Nhóm 1: i -> a reru; Nhóm 2: + rareru; Nhóm 3: korareru, sareru',
    explanation: 'Diễn tả hành động bị tác động bởi người khác.',
    example: '先生にほめられました。(Sensei ni homeraremashita - Tôi được thầy giáo khen.)',
    translation: 'Tôi được thầy giáo khen.',
    category: 'Thể bị động',
    pitfall: 'Bị động tiếng Nhật không chỉ "bị" mà còn "được" — khác với bị động tiếng Việt'
  },
  // Bài 38
  {
    id: 'g38-1', lesson: 38, level: 'N4',
    title: 'Danh từ hóa vế câu (V-no)',
    usage: 'Vる + のは/のが/のを',
    explanation: 'Biến một vế câu thành một danh từ.',
    example: 'テニスをするのは面白いです。(Tenisu o suru no wa omoshiroi desu - Việc chơi tennis rất thú vị.)',
    translation: 'Việc chơi tennis rất thú vị.',
    category: 'Danh từ hóa'
  },
  // Bài 39
  {
    id: 'g39-1', lesson: 39, level: 'N4',
    title: 'Vて / Aくて (Lý do)',
    usage: 'Vて/Aくて/Nで、～',
    explanation: 'Diễn tả nguyên nhân, lý do (thường dẫn đến kết quả không mong muốn hoặc cảm xúc).',
    example: 'ニュースを聞いて、びっくりしました。(Nyuusu o kiite, bikkuri shimashita - Nghe tin xong tôi đã rất ngạc nhiên.)',
    translation: 'Nghe tin xong tôi đã rất ngạc nhiên.',
    category: 'Nguyên nhân'
  },
  // Bài 40
  {
    id: 'g40-1', lesson: 40, level: 'N4',
    title: 'Lồng câu nghi vấn',
    usage: 'Từ để hỏi + か / ～かどうか',
    explanation: 'Lồng một câu hỏi vào trong một câu khác.',
    example: '彼が来るかどうか、わかりません。(Kare ga kuru kadouka, wakarimasen - Tôi không biết liệu anh ấy có đến hay không.)',
    translation: 'Tôi không biết liệu anh ấy có đến hay không.',
    category: 'Câu nghi vấn'
  },
  {
    id: 'g40-2', lesson: 40, level: 'N4',
    title: 'Vてみます',
    usage: 'Vて みます',
    explanation: 'Thử làm một việc gì đó.',
    example: 'この靴を履いてみてもいいですか。(Kono kutsu o haite mitemo ii desuka - Tôi có thể đi thử đôi giày này không?)',
    translation: 'Tôi có thể đi thử đôi giày này không?',
    category: 'Thử nghiệm'
  },
  // Bài 41
  {
    id: 'g41-1', lesson: 41, level: 'N4',
    title: 'Cho nhận (Kính ngữ)',
    usage: '～て くださいます / ～て いただきます / ～て やります',
    explanation: 'Dạng kính ngữ và khiêm nhường ngữ của cho-nhận hành động.',
    example: '部長がレポートを直してくださいました。(Buchou ga repooto o naoshite kudasaimashita - Trưởng phòng đã sửa giúp tôi bản báo cáo.)',
    translation: 'Trưởng phòng đã sửa giúp tôi bản báo cáo.',
    category: 'Cho nhận'
  },
  // Bài 42
  {
    id: 'g42-1', lesson: 42, level: 'N4',
    title: 'Mục đích (Vる ために)',
    usage: 'Vる / Nの ために',
    explanation: 'Diễn tả mục đích (ý chí).',
    example: '将来自分の店を持つために、貯金しています。(Shourai jibun no mise o motsu tame ni, chokin shite imasu - Để sau này có cửa hàng riêng, tôi đang tiết kiệm tiền.)',
    translation: 'Để sau này có cửa hàng riêng, tôi đang tiết kiệm tiền.',
    category: 'Mục đích',
    related: ['g36-1']
  },
  {
    id: 'g42-2', lesson: 42, level: 'N4',
    title: 'Dùng cho / Trong việc (Vるのに)',
    usage: 'Vるのに / Nに (dùng cho/mất bao lâu/trong việc...)',
    explanation: 'Diễn tả công dụng hoặc mục đích của vật/việc.',
    example: 'このはさみは花を切るのに使います。(Kono hasami wa hana o kiru noni tsukaimasu - Cái kéo này dùng để cắt hoa.)',
    translation: 'Cái kéo này dùng để cắt hoa.',
    category: 'Cách dùng'
  },
  // Bài 43
  {
    id: 'g43-1', lesson: 43, level: 'N4',
    title: 'Có vẻ (V/A Sou desu)',
    usage: 'V (bỏ masu) / A (bỏ i/na) そうです',
    explanation: 'Dự đoán dựa trên vẻ bề ngoài hoặc dấu hiệu.',
    example: '今にも雨が降りそうです。(Ima nimo ame ga furisou desu - Trời có vẻ sắp mưa đến nơi rồi.)',
    translation: 'Trời có vẻ sắp mưa đến nơi rồi.',
    category: 'Dự đoán',
    related: ['g32-2', 'g47-2'],
    pitfall: 'Đừng nhầm 〜そうだ (có vẻ) với 〜そうだ (nghe nói) — khác hoàn toàn về cách chia và ý nghĩa'
  },
  {
    id: 'g43-2', lesson: 43, level: 'N4',
    title: 'Đi làm gì rồi về (V-te kimasu)',
    usage: 'Vて きます',
    explanation: 'Đi làm một việc gì đó rồi quay lại.',
    example: 'ちょっとタバコを買ってきます。(Chotto tabako o katte kimasu - Tôi đi mua thuốc lá một chút rồi về.)',
    translation: 'Tôi đi mua thuốc lá một chút rồi về.',
    category: 'Hành động'
  },
  // Bài 44
  {
    id: 'g44-1', lesson: 44, level: 'N4',
    title: 'Quá (V/A Sugimasu)',
    usage: 'V (bỏ masu) / A (bỏ i/na) すぎます',
    explanation: 'Diễn tả sự vượt quá mức độ bình thường (thường mang ý tiêu cực).',
    example: '昨夜お酒を飲みすぎました。(Sakuya osake o nomisugimashita - Tối qua tôi đã uống quá nhiều rượu.)',
    translation: 'Tối qua tôi đã uống quá nhiều rượu.',
    category: 'Mức độ'
  },
  {
    id: 'g44-2', lesson: 44, level: 'N4',
    title: 'Dễ / Khó làm gì',
    usage: 'V (bỏ masu) + やすい / にくい',
    explanation: 'Diễn tả tính chất của hành động hoặc vật.',
    example: 'このペンは書きやすいです。(Kono pen wa kakiyasui desu - Chiếc bút này dễ viết.)',
    translation: 'Chiếc bút này dễ viết.',
    category: 'Tính chất'
  },
  // Bài 45
  {
    id: 'g45-1', lesson: 45, level: 'N4',
    title: 'Trong trường hợp (Baai wa)',
    usage: 'V/A/N (thể thông thường) + 場合は',
    explanation: 'Giả định một tình huống cụ thể.',
    example: '火事の場合は、エレベーターを使わないでください。(Kaji no baai wa, erebeetaa o tsukawanaide kudasai - Trong trường hợp hỏa hoạn, xin đừng sử dụng thang máy.)',
    translation: 'Trong trường hợp hỏa hoạn, xin đừng sử dụng thang máy.',
    category: 'Điều kiện',
    related: ['g35-1']
  },
  {
    id: 'g45-2', lesson: 45, level: 'N4',
    title: 'Mặc dù (Noni)',
    usage: 'V/A/N (thể thông thường) + のに',
    explanation: 'Diễn tả sự tương phản mang tính bất ngờ hoặc hối tiếc.',
    example: '約束をしたのに、彼女は来ませんでした。(Yakusoku o shita noni, kanojo wa kimasen deshita - Mặc dù đã hẹn nhưng cô ấy không đến.)',
    translation: 'Mặc dù đã hẹn nhưng cô ấy không đến.',
    category: 'Nghịch lý'
  },
  // Bài 46
  {
    id: 'g46-1', lesson: 46, level: 'N4',
    title: 'Đang lúc / Vừa mới (Tokoro desu)',
    usage: 'Vる / Vている / Vた + ところです',
    explanation: 'Diễn tả các giai đoạn của hành động (sắp, đang, vừa xong).',
    example: '今、ご飯を食べるところです。(Ima, gohan o taberu tokoro desu - Bây giờ tôi sắp ăn cơm.)',
    translation: 'Bây giờ tôi sắp ăn cơm.',
    category: 'Thời điểm',
    related: ['g46-2']
  },
  {
    id: 'g46-2', lesson: 46, level: 'N4',
    title: 'Vừa mới (Ta-bakari)',
    usage: 'Vた ばかりです',
    explanation: 'Diễn tả hành động vừa mới xảy ra (theo cảm nhận của người nói).',
    example: 'さっき昼ご飯を食べたばかりです。(Sakki hirugohan o tabeta bakari desu - Tôi vừa mới ăn trưa xong.)',
    translation: 'Tôi vừa mới ăn trưa xong.',
    category: 'Thời điểm',
    related: ['g46-1']
  },
  // Bài 47
  {
    id: 'g47-1', lesson: 47, level: 'N4',
    title: 'Nghe nói (Sou desu)',
    usage: 'V/A/N (thể thông thường) + そうです',
    explanation: 'Trình bày lại thông tin nghe được từ nguồn khác.',
    example: '天気予報によると、明日は晴れるそうです。(Tenki yohou ni yoru to, ashita wa hareru sou desu - Theo dự báo thời tiết, nghe nói ngày mai trời sẽ nắng.)',
    translation: 'Theo dự báo thời tiết, nghe nói ngày mai trời sẽ nắng.',
    category: 'Trích dẫn',
    related: ['g33-2'],
    pitfall: 'Đừng nhầm 〜そうだ (nghe nói) với 〜そうだ (có vẻ) — nghe nói dùng thể thông thường + そうだ, có vẻ dùng thể liên dụng + そうだ'
  },
  {
    id: 'g47-2', lesson: 47, level: 'N4',
    title: 'Có vẻ / Hình như (You desu)',
    usage: 'V/A/N (thể thông thường) + ようです',
    explanation: 'Dự đoán dựa trên những gì mắt thấy tai nghe hoặc trải nghiệm.',
    example: '外は雨が降っているようです。(Soto wa ame ga futte iru you desu - Bên ngoài hình như trời đang mưa.)',
    translation: 'Bên ngoài hình như trời đang mưa.',
    category: 'Dự đoán',
    related: ['g32-2', 'g43-1']
  },
  // Bài 48
  {
    id: 'g48-1', lesson: 48, level: 'N4',
    title: 'Thể sai khiến (Shimeki)',
    usage: 'Nhóm 1: i -> a seru; Nhóm 2: + saseru; Nhóm 3: kosaseru, saseru',
    explanation: 'Cho phép hoặc bắt buộc ai đó làm gì.',
    example: '息子に野菜を食べさせました。(Musuko ni yasai o tabesasemashita - Tôi bắt con trai ăn rau.)',
    translation: 'Tôi bắt con trai ăn rau.',
    category: 'Thể sai khiến',
    pitfall: 'Sai khiến + もらう = "nhờ ai đó cho làm" (行かせてもらう = được cho phép đi)'
  },
  // Bài 49
  {
    id: 'g49-1', lesson: 49, level: 'N4',
    title: 'Tôn kính ngữ (Sonkeigo)',
    usage: 'Vられる / お V に なります / Đặc biệt (Irasshaimasu, v.v.)',
    explanation: 'Dùng để nâng cao hành động của người đối diện hoặc người được nhắc đến.',
    example: '先生はもうお帰りになりました。(Sensei wa mou okaeri ni narimashita - Thầy giáo đã về rồi ạ.)',
    translation: 'Thầy giáo đã về rồi ạ.',
    category: 'Kính ngữ',
    related: ['g50-1']
  },
  // Bài 50
  {
    id: 'g50-1', lesson: 50, level: 'N4',
    title: 'Khiêm nhường ngữ (Kenjougo)',
    usage: 'お V します / Đặc biệt (Mairimasu, Moushimasu, v.v.)',
    explanation: 'Dùng để hạ thấp hành động của bản thân nhằm bày tỏ sự kính trọng.',
    example: 'お荷物をお持ちしましょうか。(Onimotsu o omochishimashouka - Để tôi cầm hành lý giúp ngài nhé?)',
    translation: 'Để tôi cầm hành lý giúp ngài nhé?',
    category: 'Kính ngữ',
    related: ['g49-1']
  },
  // ==================== N3 ====================
  {
    id: 'g51-1', lesson: 51, level: 'N3',
    title: 'V ている場合じゃない',
    usage: 'V ている + 場合じゃない',
    explanation: 'Không phải lúc để làm gì — diễn tả tình huống khẩn cấp, không có thời gian.',
    example: '遊んでる場合じゃないよ。(Asonderu baai janai yo - Đây không phải lúc để chơi đâu.)',
    translation: 'Đây không phải lúc để chơi đâu.',
    category: 'Cấu trúc tình huống',
    related: ['g45-1']
  },
  {
    id: 'g51-2', lesson: 51, level: 'N3',
    title: 'V たきり',
    usage: 'Vた + きり',
    explanation: 'Sau khi làm gì đó mà vẫn giữ nguyên trạng thái đó, hoặc kể từ đó không làm gì nữa.',
    example: '彼は出かけたきり帰ってこない。(Kare wa dekaketa kiri kaette konai - Anh ấy ra ngoài rồi không về luôn.)',
    translation: 'Anh ấy ra ngoài rồi không về luôn.',
    category: 'Trạng thái'
  },
  {
    id: 'g51-3', lesson: 51, level: 'N3',
    title: '～かわりに',
    usage: 'Vる / Nの + かわりに',
    explanation: 'Thay vì làm gì đó, hoặc thay thế cho ai/cái gì.',
    example: '私のかわりに行ってください。(Watashi no kawari ni itte kudasai - Hãy đi thay tôi.)',
    translation: 'Hãy đi thay tôi.',
    category: 'Thay thế'
  },
  {
    id: 'g52-1', lesson: 52, level: 'N3',
    title: '〜うちに',
    usage: 'Vる/Vている/Vない + うちに',
    explanation: 'Trong khi / trong lúc (nhấn mạnh tận dụng khoảng thời gian).',
    example: '明るいうちに帰ろう。(Akarui uchi ni kaerou - Về trong lúc trời còn sáng nào.)',
    translation: 'Về trong lúc trời còn sáng nào.',
    category: 'Thời gian',
    related: ['g36-1'],
    pitfall: 'Phân biệt うちに (tận dụng khoảng thời gian) với 間に (trong khoảng thời gian, trung tính)'
  },
  {
    id: 'g52-2', lesson: 52, level: 'N3',
    title: '〜たところだ',
    usage: 'Vた + ところだ',
    explanation: 'Vừa mới làm gì đó xong (nhấn mạnh sự vừa xong ngay lúc nói).',
    example: '今着いたところです。(Ima tsuita tokoro desu - Tôi vừa mới đến nơi.)',
    translation: 'Tôi vừa mới đến nơi.',
    category: 'Thời điểm',
    related: ['g46-1', 'g46-2'],
    pitfall: 'Khác với 〜たばかり (cảm giác "mới" chủ quan) — ところ là khách quan, vừa xong ngay trước khi nói'
  },
  {
    id: 'g52-3', lesson: 52, level: 'N3',
    title: '〜ついでに',
    usage: 'Vる/Vた + ついでに / Nの + ついでに',
    explanation: 'Nhân tiện / tiện thể làm việc gì đó khi đang làm việc khác.',
    example: '銀行に行くついでに、郵便局に寄った。(Ginkou ni iku tsuide ni, yuubinkyoku ni yotta - Nhân tiện đi ngân hàng, tôi ghé qua bưu điện.)',
    translation: 'Nhân tiện đi ngân hàng, tôi ghé qua bưu điện.',
    category: 'Thời gian'
  },
  {
    id: 'g53-1', lesson: 53, level: 'N3',
    title: '〜に違いない',
    usage: 'V/A/N (thể thông thường) + に違いない',
    explanation: 'Chắc chắn là... (suy luận mạnh của người nói, gần như 100%).',
    example: 'あれは幽霊に違いない。(Are wa yuurei ni chigainai - Chắc chắn đó là ma.)',
    translation: 'Chắc chắn đó là ma.',
    category: 'Suy luận',
    related: ['g32-2'],
    pitfall: 'Mạnh hơn 〜はずだ và 〜だろう — dùng khi có cơ sở vững chắc'
  },
  {
    id: 'g53-2', lesson: 53, level: 'N3',
    title: '〜に過ぎない',
    usage: 'Vる / N + に過ぎない',
    explanation: 'Chỉ là... mà thôi (đánh giá thấp, khiêm tốn).',
    example: 'これはただの噂に過ぎない。(Kore wa tada no uwasa ni suginai - Đây chỉ là tin đồn mà thôi.)',
    translation: 'Đây chỉ là tin đồn mà thôi.',
    category: 'Mức độ'
  },
  {
    id: 'g53-3', lesson: 53, level: 'N3',
    title: '〜に決まっている',
    usage: 'V/A/N (thể thông thường) + に決まっている',
    explanation: 'Chắc chắn là... / Hiển nhiên là... (tự nhiên, đương nhiên).',
    example: 'そんなこと、子供にでもできるに決まっている。(Sonna koto, kodomo ni demo dekiru ni kimatte iru - Chuyện đó hiển nhiên ngay cả trẻ con cũng làm được.)',
    translation: 'Chuyện đó hiển nhiên ngay cả trẻ con cũng làm được.',
    category: 'Suy luận',
    related: ['g53-1']
  },
  {
    id: 'g54-1', lesson: 54, level: 'N3',
    title: '〜ように言う',
    usage: 'Vる/Vない + ように言う',
    explanation: 'Nói / bảo / yêu cầu ai đó làm gì (gián tiếp).',
    example: '先生に早く来るように言われた。(Sensei ni hayaku kuru you ni iwareta - Tôi được thầy bảo hãy đến sớm.)',
    translation: 'Tôi được thầy bảo hãy đến sớm.',
    category: 'Tường thuật',
    related: ['g36-1', 'g33-2']
  },
  {
    id: 'g54-2', lesson: 54, level: 'N3',
    title: '〜ことにする / 〜ことになる',
    usage: 'Vる + ことにする / ことになる',
    explanation: 'Quyết định làm gì (tự quyết / quyết định từ hoàn cảnh bên ngoài).',
    example: '毎日運動することにした。(Mainichi undou suru koto ni shita - Tôi quyết định tập thể dục mỗi ngày.)',
    translation: 'Tôi quyết định tập thể dục mỗi ngày.',
    category: 'Quyết định',
    related: ['g54-3']
  },
  {
    id: 'g54-3', lesson: 54, level: 'N3',
    title: '〜ことにしている / 〜ことになっている',
    usage: 'Vる + ことにしている / ことになっている',
    explanation: 'Quy tắc / lịch trình / thói quen đã được sắp xếp từ trước.',
    example: '毎朝6時に起きることにしている。(Maiasa rokuji ni okiru koto ni shite iru - Tôi có thói quen dậy lúc 6 giờ mỗi sáng.)',
    translation: 'Tôi có thói quen dậy lúc 6 giờ mỗi sáng.',
    category: 'Thói quen',
    related: ['g54-2']
  },
  {
    id: 'g55-1', lesson: 55, level: 'N3',
    title: '〜を通じて / 〜を通して',
    usage: 'N + を通じて / を通して',
    explanation: 'Thông qua / trong suốt (phương tiện hoặc khoảng thời gian).',
    example: 'インターネットを通じて世界中と繋がれる。(Intaanetto o tsuujite sekaijuu to tsunagareru - Có thể kết nối với toàn thế giới thông qua Internet.)',
    translation: 'Có thể kết nối với toàn thế giới thông qua Internet.',
    category: 'Phương tiện'
  },
  {
    id: 'g55-2', lesson: 55, level: 'N3',
    title: '〜に基づいて',
    usage: 'N + に基づいて',
    explanation: 'Dựa trên / căn cứ vào (cơ sở khách quan).',
    example: '事実に基づいて判断しよう。(Jijitsu ni motozuite handan shiyou - Hãy phán đoán dựa trên sự thật.)',
    translation: 'Hãy phán đoán dựa trên sự thật.',
    category: 'Căn cứ'
  },
  {
    id: 'g55-3', lesson: 55, level: 'N3',
    title: '〜に対して',
    usage: 'N + に対して',
    explanation: 'Đối với / về phía (hướng hành động đến ai đó).',
    example: 'お客様に対して丁寧に応対する。(Okyakusama ni taishite teinei ni outai suru - Đối xử lịch sự với khách hàng.)',
    translation: 'Đối xử lịch sự với khách hàng.',
    category: 'Quan hệ'
  },
  {
    id: 'g56-1', lesson: 56, level: 'N3',
    title: '〜に関して',
    usage: 'N + に関して',
    explanation: 'Liên quan đến / về vấn đề (trang trọng hơn 〜について).',
    example: 'この件に関しては後ほど説明します。(Kono ken ni kanshite wa nochihodo setsumei shimasu - Về vấn đề này tôi sẽ giải thích sau.)',
    translation: 'Về vấn đề này tôi sẽ giải thích sau.',
    category: 'Chủ đề',
    pitfall: 'Trang trọng hơn 〜について, thường dùng trong văn bản hoặc tình huống lịch sự'
  },
  {
    id: 'g56-2', lesson: 56, level: 'N3',
    title: '〜を中心に',
    usage: 'N + を中心に',
    explanation: 'Lấy... làm trung tâm / chủ yếu.',
    example: '若者を中心に人気がある。(Wakamono o chuushin ni ninki ga aru - Phổ biến chủ yếu ở giới trẻ.)',
    translation: 'Phổ biến chủ yếu ở giới trẻ.',
    category: 'Trọng tâm'
  },
  {
    id: 'g56-3', lesson: 56, level: 'N3',
    title: '〜として',
    usage: 'N + として',
    explanation: 'Với tư cách là / với vai trò là.',
    example: '趣味として日本語を勉強している。(Shumi to shite Nihongo o benkyou shite iru - Tôi học tiếng Nhật như một sở thích.)',
    translation: 'Tôi học tiếng Nhật như một sở thích.',
    category: 'Vai trò'
  },
  {
    id: 'g57-1', lesson: 57, level: 'N3',
    title: '〜かけだ / 〜かける',
    usage: 'V (bỏ masu) + かけだ / かける',
    explanation: 'Đang làm dở / chưa xong /chuẩn bị làm.',
    example: '食べかけのご飯がまだある。(Tabekake no gohan ga mada aru - Còn cơm đang ăn dở.)',
    translation: 'Còn cơm đang ăn dở.',
    category: 'Trạng thái'
  },
  {
    id: 'g57-2', lesson: 57, level: 'N3',
    title: '〜がちだ',
    usage: 'V (bỏ masu) + がちだ / N + がちだ',
    explanation: 'Có xu hướng / hay làm gì đó (tiêu cực, thường xuyên).',
    example: '最近忘れがちだ。(Saikin wasuregachi da - Gần đây tôi hay quên.)',
    translation: 'Gần đây tôi hay quên.',
    category: 'Xu hướng',
    related: ['g58-1']
  },
  {
    id: 'g57-3', lesson: 57, level: 'N3',
    title: '〜気味だ',
    usage: 'V (bỏ masu) + 気味だ / N + 気味だ',
    explanation: 'Hơi có vẻ / hơi nghiêng về (sắc thái tiêu cực nhẹ).',
    example: '最近疲れ気味だ。(Saikin tsukaregimi da - Gần đây tôi hơi mệt mỏi.)',
    translation: 'Gần đây tôi hơi mệt mỏi.',
    category: 'Tình trạng',
    related: ['g57-2'],
    pitfall: 'Nhẹ hơn 〜がち — 気味 là "hơi có khuynh hướng" còn がち là "thường xuyên xảy ra"'
  },
  {
    id: 'g58-1', lesson: 58, level: 'N3',
    title: '〜ぎみ vs 〜がち vs 〜っぽい',
    usage: 'ぎみ・がち・っぽい',
    explanation: 'Phân biệt: ぎみ = hơi (sức khỏe/cảm xúc), がち = có xu hướng (thói quen xấu), っぽい = có vẻ / dễ (tính cách).',
    example: '彼女は飽きっぽい性格だ。(Kanojo wa akippoi seikaku da - Cô ấy có tính cách dễ chán.)',
    translation: 'Cô ấy có tính cách dễ chán.',
    category: 'Xu hướng',
    related: ['g57-2', 'g57-3']
  },
  {
    id: 'g58-2', lesson: 58, level: 'N3',
    title: '〜たびに',
    usage: 'Vる / Nの + たびに',
    explanation: 'Mỗi khi / hễ... là (lặp lại, kèm cảm nhận của người nói).',
    example: '彼女に会うたびに緊張する。(Kanojo ni au tabi ni kinchou suru - Mỗi lần gặp cô ấy tôi đều căng thẳng.)',
    translation: 'Mỗi lần gặp cô ấy tôi đều căng thẳng.',
    category: 'Lặp lại'
  },
  {
    id: 'g58-3', lesson: 58, level: 'N3',
    title: '〜一方だ',
    usage: 'Vる + 一方だ',
    explanation: 'Càng ngày càng / không ngừng (thay đổi theo một hướng, thường là tiêu cực).',
    example: '環境破壊は進む一方だ。(Kankyou hakai wa susumu ippou da - Sự hủy hoại môi trường ngày càng gia tăng.)',
    translation: 'Sự hủy hoại môi trường ngày càng gia tăng.',
    category: 'Xu hướng'
  },
  {
    id: 'g59-1', lesson: 59, level: 'N3',
    title: '〜というより',
    usage: 'V/A/N (thể thông thường) + というより',
    explanation: 'Nói đúng hơn là / thà nói là... còn hơn.',
    example: '彼は先生というより友達みたいだ。(Kare wa sensei to iu yori tomodachi mitai da - Anh ấy nói đúng hơn là bạn chứ không phải thầy giáo.)',
    translation: 'Anh ấy nói đúng hơn là bạn chứ không phải thầy giáo.',
    category: 'So sánh'
  },
  {
    id: 'g59-2', lesson: 59, level: 'N3',
    title: '〜からと言って',
    usage: 'V/A/N (thể thông thường) + からと言って',
    explanation: 'Dù có lý do gì cũng không / đừng tưởng rằng.',
    example: '高いからと言って美味しいとは限らない。(Takai kara to itte oishii to wa kagiranai - Đừng tưởng rằng đắt thì ngon.)',
    translation: 'Đừng tưởng rằng đắt thì ngon.',
    category: 'Phản bác'
  },
  {
    id: 'g59-3', lesson: 59, level: 'N3',
    title: '〜ものなら',
    usage: 'Vる + ものなら',
    explanation: 'Nếu có thể... thì (điều khó xảy ra, thường là mong muốn).',
    example: 'できるものならやってみなさい。(Dekiru mono nara yatte minasai - Nếu làm được thì làm thử đi.)',
    translation: 'Nếu làm được thì làm thử đi.',
    category: 'Điều kiện',
    related: ['g35-1']
  },
  {
    id: 'g60-1', lesson: 60, level: 'N3',
    title: '〜わけだ / 〜わけがない',
    usage: 'V/A/N (thể thông thường) + わけだ / わけがない',
    explanation: 'Đương nhiên là (giải thích hợp lý) / không thể nào (phủ định mạnh).',
    example: '彼は日本に10年いたんだ。日本語が上手なわけだ。(Kare wa Nihon ni juunen itanda. Nihongo ga jouzuna wake da - Anh ấy sống ở Nhật 10 năm. Đương nhiên tiếng Nhật giỏi rồi.)',
    translation: 'Anh ấy sống ở Nhật 10 năm. Đương nhiên tiếng Nhật giỏi rồi.',
    category: 'Suy luận',
    related: ['g53-1'],
    pitfall: 'わけがない (không thể nào) mạnh hơn とは限らない (không nhất thiết)'
  },
  {
    id: 'g60-2', lesson: 60, level: 'N3',
    title: '〜はずだ / 〜はずがない',
    usage: 'V/A/N (thể thông thường) + はずだ / はずがない',
    explanation: 'Đáng lẽ (kỳ vọng dựa trên thông tin) / không thể nào.',
    example: '約束したから、彼は来るはずだ。(Yakusoku shita kara, kare wa kuru hazu da - Vì đã hứa nên đáng lẽ anh ấy sẽ đến.)',
    translation: 'Vì đã hứa nên đáng lẽ anh ấy sẽ đến.',
    category: 'Dự đoán',
    related: ['g53-1', 'g60-1']
  },
  {
    id: 'g60-3', lesson: 60, level: 'N3',
    title: '〜にしたがって',
    usage: 'Vる + にしたがって / N + にしたがって',
    explanation: 'Theo / cùng với (sự thay đổi song song).',
    example: '練習するにしたがって上手になる。(Renshuu suru ni shitagatte jouzu ni naru - Càng luyện tập càng giỏi lên.)',
    translation: 'Càng luyện tập càng giỏi lên.',
    category: 'Thay đổi',
    related: ['g35-2']
  },
];

/**
 * Extract Japanese keyword signatures from a GrammarPoint for matching.
 * Strips placeholder markers (~, N, V, A), Latin text, and Vietnamese text,
 * keeping only Japanese characters (kanji, hiragana, katakana).
 * Handles patterns like "~ は ~ です" → ["は", "です"],
 * "これ / それ / あれ" → ["これ", "それ", "あれ"],
 * "Vたほうがいい / Vないほうがいい" → ["たほうがいい", "ないほうがいい"]
 */
export function extractJapaneseKeywords(point: GrammarPoint): string[] {
  const combined = `${point.title} ${point.usage}`;
  // Match sequences of Japanese chars: kanji, hiragana, katakana
  const japaneseRegex = /[぀-ゟ゠-ヿ一-龯]+/g;
  const matches: string[] = combined.match(japaneseRegex) || [];
  // Also capture sequences that follow V~/A~/N~ markers like たほうがいい, てしまいます
  const extraRegex = /(?:V|A|N)～?([぀-ゟ゠-ヿ一-龯]+)/g;
  let match;
  while ((match = extraRegex.exec(combined)) !== null) {
    matches.push(match[1]);
  }
  return [...new Set(matches)];
}

/**
 * Detect which grammar points from GRAMMAR_DB likely appear in the given text.
 * Checks if all extracted Japanese keywords from each grammar point appear in the text.
 */
export function detectMatchingGrammarPoints(text: string): GrammarPoint[] {
  if (!text?.trim()) return [];

  return GRAMMAR_DB.filter(point => {
    const keywords = extractJapaneseKeywords(point);
    if (keywords.length === 0) return false;
    return keywords.every(kw => text.includes(kw));
  });
}
