export interface GrammarPoint {
  id: string;
  lesson: number;
  level: 'N5' | 'N4';
  title: string;
  usage: string;
  explanation: string;
  example: string;
  category: string;
}

export const GRAMMAR_DB: GrammarPoint[] = [
  // Bài 1
  {
    id: 'g1-1',
    lesson: 1,
    level: 'N5',
    title: '~ は ~ です',
    usage: 'N1 は N2 です',
    explanation: 'Khẳng định N1 là N2. は là trợ từ chủ ngữ, です kết thúc câu lịch sự.',
    example: '私はマイです。(Watashi wa Mai desu - Tôi là Mai.)',
    category: 'Cấu trúc cơ bản'
  },
  {
    id: 'g1-2',
    lesson: 1,
    level: 'N5',
    title: '~ は ~ じゃありません',
    usage: 'N1 は N2 じゃありません',
    explanation: 'Phủ định của です. Có thể dùng では ありません trong văn viết.',
    example: 'サントスさんは学生じゃありません。(Santosu-san wa gakusei ja arimasen - Anh Santos không phải là sinh viên.)',
    category: 'Cấu trúc cơ bản'
  },
  {
    id: 'g1-3',
    lesson: 1,
    level: 'N5',
    title: '~ は ~ ですか',
    usage: 'N1 は N2 ですか',
    explanation: 'Câu nghi vấn (câu hỏi). Thêm か vào cuối câu để tạo câu hỏi.',
    example: 'ミラーさんは会社員ですか。(Miraa-san wa kaishain desuka - Anh Miller là nhân viên công ty phải không?)',
    category: 'Câu nghi vấn'
  },
  {
    id: 'g1-4',
    lesson: 1,
    level: 'N5',
    title: '~ も',
    usage: 'N1 も N2 です',
    explanation: 'Trợ từ も (cũng). Dùng thay cho は khi đối tượng có cùng đặc điểm với đối tượng trước đó.',
    example: '私も会社員です。(Watashi mo kaishain desu - Tôi cũng là nhân viên công ty.)',
    category: 'Trợ từ'
  },
  {
    id: 'g1-5',
    lesson: 1,
    level: 'N5',
    title: 'N1 の N2',
    usage: 'N1 の N2',
    explanation: 'Trợ từ の dùng để nối 2 danh từ. N1 bổ nghĩa cho N2 (sở hữu, thuộc về, nội dung).',
    example: 'ミラーさんは IMC の社員です。(Miraa-san wa IMC no shain desu - Anh Miller là nhân viên của công ty IMC.)',
    category: 'Trợ từ'
  },
  // Bài 2
  {
    id: 'g2-1',
    lesson: 2,
    level: 'N5',
    title: 'これ / それ / あれ',
    usage: 'これ/それ/あれ は N です',
    explanation: 'Đại từ chỉ định vật. これ (này), それ (đó), あれ (kia).',
    example: 'これは辞書です。(Kore wa jisho desu - Đây là từ điển.)',
    category: 'Đại từ'
  },
  {
    id: 'g2-2',
    lesson: 2,
    level: 'N5',
    title: 'この / その / あの',
    usage: 'この/その/あの N は ~ です',
    explanation: 'Tính từ chỉ định. Phải có danh từ đi kèm ngay sau đó.',
    example: 'この本は私のです。(Kono hon wa watashi no desu - Cuốn sách này là của tôi.)',
    category: 'Đại từ'
  },
  {
    id: 'g2-3',
    lesson: 2,
    level: 'N5',
    title: 'そうです / そうじゃありません',
    usage: 'はい、そうです / いいえ、そうじゃありません',
    explanation: 'Cách trả lời câu hỏi nghi vấn danh từ.',
    example: 'それはテレホンカードですか。…はい、そうです。(Sore wa terehon kaado desuka. ...Hai, sou desu - Đó là thẻ điện thoại phải không? ...Vâng, đúng vậy.)',
    category: 'Cách trả lời'
  },
  // Bài 3
  {
    id: 'g3-1',
    lesson: 3,
    level: 'N5',
    title: 'ここ / そこ / あそこ',
    usage: 'ここ/そこ/あそこ は N (địa điểm) です',
    explanation: 'Đại từ chỉ địa điểm. ここ (đây), そこ (đó), あそこ (kia).',
    example: 'ここは食堂です。(Koko wa shokudou desu - Đây là nhà ăn.)',
    category: 'Địa điểm'
  },
  {
    id: 'g3-2',
    lesson: 3,
    level: 'N5',
    title: 'こちら / そちら / あちら / どちら',
    usage: 'こちら/そちら/あちら は N です',
    explanation: 'Hướng hoặc địa điểm (cách nói lịch sự). どちら dùng để hỏi.',
    example: 'お手洗いはどちらですか。…あちらです。(Otearai wa dochira desuka. ...Achira desu - Nhà vệ sinh ở phía nào? ...Phía kia ạ.)',
    category: 'Lịch sự'
  },
  // Bài 4
  {
    id: 'g4-1',
    lesson: 4,
    level: 'N5',
    title: 'Động từ ます / ません / ました / ませんでした',
    usage: 'V ます/ません/ました/ませんでした',
    explanation: 'Các dạng thời và khẳng định/phủ định của động từ lịch sự.',
    example: '毎朝 6 時に起きます。(Maiasa rokuji ni okimasu - Mỗi sáng tôi dậy lúc 6 giờ.)',
    category: 'Động từ'
  },
  {
    id: 'g4-2',
    lesson: 4,
    level: 'N5',
    title: 'N (thời gian) に V',
    usage: 'N (thời gian) に V',
    explanation: 'Trợ từ に đi sau danh từ chỉ thời gian cụ thể (có số).',
    example: '10 時半に寝ます。(Juujihan ni nemasu - Tôi ngủ lúc 10 giờ rưỡi.)',
    category: 'Trợ từ'
  },
  // Bài 5
  {
    id: 'g5-1',
    lesson: 5,
    level: 'N5',
    title: 'N (địa điểm) へ いきます / きます / かえります',
    usage: 'N (địa điểm) へ いきます/きます/かえります',
    explanation: 'Trợ từ へ chỉ hướng di chuyển.',
    example: '京都へ行きます。(Kyouto e ikimasu - Tôi đi Kyoto.)',
    category: 'Di chuyển'
  },
  {
    id: 'g5-2',
    lesson: 5,
    level: 'N5',
    title: 'N (phương tiện) で いきます / きます / かえります',
    usage: 'N (phương tiện) で V',
    explanation: 'Trợ từ で chỉ phương tiện giao thông.',
    example: '電車で行きます。(Densha de ikimasu - Tôi đi bằng tàu điện.)',
    category: 'Trợ từ'
  },
  // Bài 26
  {
    id: 'g26-1',
    lesson: 26,
    level: 'N4',
    title: '～んです',
    usage: 'V/A/N (thể thông thường) + んです',
    explanation: 'Dùng để nhấn mạnh ý nghĩa, giải thích lý do, hoặc yêu cầu giải thích.',
    example: '明日から旅行なんです。(Ashita kara ryokou nandesu - Từ ngày mai tôi sẽ đi du lịch.)',
    category: 'Cấu trúc nhấn mạnh'
  },
  {
    id: 'g26-2',
    lesson: 26,
    level: 'N4',
    title: 'Vていただけませんか',
    usage: 'Vて + いただけませんか',
    explanation: 'Yêu cầu, nhờ vả ai đó làm gì một cách lịch sự.',
    example: '書き方を教えていただけませんか。(Kakikata o oshiete itadakemasenka - Anh/Chị có thể dạy tôi cách viết không?)',
    category: 'Cấu trúc yêu cầu'
  },
  {
    id: 'g26-3',
    lesson: 26,
    level: 'N4',
    title: 'Từ để hỏi + Vたら いいですか',
    usage: 'Từ để hỏi + Vたら いいですか',
    explanation: 'Dùng khi muốn xin lời khuyên hoặc chỉ dẫn.',
    example: 'どこでカメラを買ったらいいですか。(Doko de kamera o kattara ii desuka - Tôi nên mua máy ảnh ở đâu?)',
    category: 'Cấu trúc lời khuyên'
  },
  // Bài 27
  {
    id: 'g27-1',
    lesson: 27,
    level: 'N4',
    title: 'Động từ khả năng',
    usage: 'Nhóm 1: i -> e masu; Nhóm 2: + raremasu; Nhóm 3: kimasu -> koraremasu, shimasu -> dekimasu',
    explanation: 'Diễn tả khả năng con người hoặc điều kiện cho phép.',
    example: '私は日本語が話せます。(Watashi wa Nihongo ga hanasemasu - Tôi có thể nói tiếng Nhật.)',
    category: 'Thể khả năng'
  },
  {
    id: 'g27-2',
    lesson: 27,
    level: 'N4',
    title: 'みえます / きこえます',
    usage: 'N が みえます/きこえます',
    explanation: 'Nhìn thấy / nghe thấy một cách tự nhiên (không có ý chí).',
    example: '窓から山が見えます。(Mado kara yama ga miemasu - Từ cửa sổ có thể nhìn thấy núi.)',
    category: 'Thể khả năng'
  },
  {
    id: 'g27-3',
    lesson: 27,
    level: 'N4',
    title: 'しか',
    usage: 'N しか V ません',
    explanation: 'Chỉ... (đi kèm với phủ định), nhấn mạnh sự ít ỏi.',
    example: 'ローマ字しか書けません。(Roomaji shika kakemasen - Tôi chỉ có thể viết được chữ La Mã.)',
    category: 'Trợ từ'
  },
  // Bài 28
  {
    id: 'g28-1',
    lesson: 28,
    level: 'N4',
    title: 'Vながら',
    usage: 'V1 (bỏ masu) ながら V2',
    explanation: 'Vừa làm V1 vừa làm V2 (V2 là hành động chính).',
    example: '音楽を聞きながら食事します。(Ongaku o kikinagara shokuji shimasu - Tôi vừa nghe nhạc vừa ăn cơm.)',
    category: 'Hành động song song'
  },
  {
    id: 'g28-2',
    lesson: 28,
    level: 'N4',
    title: 'Vています (Duy trì)',
    usage: 'Vて います',
    explanation: 'Diễn tả một thói quen hoặc một trạng thái lặp đi lặp lại.',
    example: '毎朝ジョギングをしています。(Maiasa jogingu o shite imasu - Mỗi sáng tôi đều chạy bộ.)',
    category: 'Trạng thái'
  },
  {
    id: 'g28-3',
    lesson: 28,
    level: 'N4',
    title: '～し、～し',
    usage: 'V/A/N (thể thông thường) し、～',
    explanation: 'Dùng để liệt kê lý do, nguyên nhân hoặc các đặc điểm.',
    example: '駅から近いし、車でも来られるし、この店は便利です。(Eki kara chikaishi, kuruma demo korarerushi, kono mise wa benri desu - Vì gần nhà ga, lại có thể đi bằng ô tô nên cửa hàng này rất tiện lợi.)',
    category: 'Liên từ'
  },
  // Bài 29
  {
    id: 'g29-1',
    lesson: 29,
    level: 'N4',
    title: 'Vてしまいます',
    usage: 'Vて しまいます/しまいました',
    explanation: 'Diễn tả sự hoàn thành của hành động hoặc sự hối tiếc về một việc đã xảy ra.',
    example: '宿題を忘れてしまいました。(Shukudai o wasurete shimaimashita - Tôi lỡ quên bài tập mất rồi.)',
    category: 'Trạng thái/Cảm xúc'
  },
  {
    id: 'g29-2',
    lesson: 29,
    level: 'N4',
    title: 'Vています (Trạng thái kết quả)',
    usage: 'N が Vて います',
    explanation: 'Diễn tả trạng thái là kết quả của một hành động đã xảy ra (thường dùng tự động từ).',
    example: '窓が閉まっています。(Mado ga shimatte imasu - Cửa sổ đang đóng.)',
    category: 'Trạng thái'
  },
  // Bài 30
  {
    id: 'g30-1',
    lesson: 30,
    level: 'N4',
    title: 'Vてあります',
    usage: 'N が Vて あります',
    explanation: 'Diễn tả trạng thái là kết quả của một hành động có mục đích của ai đó (thường dùng tha động từ).',
    example: '壁にカレンダーが掛けてあります。(Kabe ni karendaa ga kakete arimasu - Trên tường có treo cái lịch.)',
    category: 'Trạng thái'
  },
  {
    id: 'g30-2',
    lesson: 30,
    level: 'N4',
    title: 'Vておきます',
    usage: 'Vて おきます',
    explanation: 'Chuẩn bị sẵn một việc gì đó, hoặc giữ nguyên một trạng thái.',
    example: '旅行の前に切符を買っておきます。(Ryokou no mae ni kippu o katte okimasu - Trước khi đi du lịch tôi sẽ mua vé sẵn.)',
    category: 'Chuẩn bị'
  },
  // Bài 31
  {
    id: 'g31-1',
    lesson: 31,
    level: 'N4',
    title: 'Thể ý định (V-ou)',
    usage: 'Nhóm 1: i -> o u; Nhóm 2: + you; Nhóm 3: kimasu -> koyou, shimasu -> shiyou',
    explanation: 'Dùng trong văn thân mật hoặc để diễn tả dự định.',
    example: 'ちょっと休もう。(Chotto yasumou - Nghỉ một lát nào.)',
    category: 'Thể ý định'
  },
  {
    id: 'g31-2',
    lesson: 31,
    level: 'N4',
    title: 'Vおうと思っています',
    usage: 'Vおう と思っています',
    explanation: 'Diễn tả một ý định đã được hình thành từ trước và vẫn đang duy trì.',
    example: '週末は海へ行こうと思っています。(Shuumatsu wa umi e ikou to omotte imasu - Tôi đang định cuối tuần đi biển.)',
    category: 'Ý định'
  },
  {
    id: 'g31-3',
    lesson: 31,
    level: 'N4',
    title: 'Vる / Vない つもりです',
    usage: 'Vる / Vない つもりです',
    explanation: 'Quyết định, dự định làm (hoặc không làm) một việc gì đó.',
    example: '来年結婚するつもりです。(Rainen kekkon suru tsumori desu - Sang năm tôi định kết hôn.)',
    category: 'Ý định'
  },
  // Bài 32
  {
    id: 'g32-1',
    lesson: 32,
    level: 'N4',
    title: 'Vたほうがいい / Vないほうがいい',
    usage: 'Vた/Vない ほうがいいです',
    explanation: 'Lời khuyên nên hoặc không nên làm gì.',
    example: '毎日運動したほうがいいですよ。(Mainichi undou shita houga ii desu yo - Anh/Chị nên vận động mỗi ngày.)',
    category: 'Lời khuyên'
  },
  {
    id: 'g32-2',
    lesson: 32,
    level: 'N4',
    title: '～でしょう / ～かもしれません',
    usage: 'V/A/N (thông thường) + でしょう/かもしれません',
    explanation: 'Dự đoán (でしょう: 70-80% chắc chắn, かもしれません: 50%).',
    example: '明日は雨が降るかもしれません。(Ashita wa ame ga furu kamo shiremasen - Ngày mai có lẽ trời sẽ mưa.)',
    category: 'Dự đoán'
  },
  // Bài 33
  {
    id: 'g33-1',
    lesson: 33,
    level: 'N4',
    title: 'Thể mệnh lệnh và cấm đoán',
    usage: 'Mệnh lệnh: Nhóm 1 (i->e), Nhóm 2 (+ro). Cấm đoán: Vるな',
    explanation: 'Dùng để ra lệnh hoặc cấm đoán (thường dùng bởi nam giới hoặc trong trường hợp khẩn cấp).',
    example: '早く寝ろ！(Hayaku nero! - Ngủ mau!); 触るな！(Sawaru na! - Cấm sờ!)',
    category: 'Cấu trúc mệnh lệnh'
  },
  {
    id: 'g33-2',
    lesson: 33,
    level: 'N4',
    title: '～と言っていました',
    usage: 'Ai đó + は ～と言っていました',
    explanation: 'Trình bày lại lời nhắn của một người khác.',
    example: '田中さんは明日休むと言っていました。(Tanaka-san wa ashita yasumu to itte imashita - Anh Tanaka nói là ngày mai anh ấy nghỉ.)',
    category: 'Trích dẫn'
  },
  // Bài 34
  {
    id: 'g34-1',
    lesson: 34,
    level: 'N4',
    title: 'Vた / Nの とおりに',
    usage: 'Vた/Nの とおりに',
    explanation: 'Làm việc gì đó theo đúng như những gì đã thấy, đã nghe hoặc theo chỉ dẫn.',
    example: '私がやったとおりに、やってください。(Watashi ga yatta toori ni, yatte kudasai - Hãy làm theo đúng như tôi đã làm.)',
    category: 'Chỉ dẫn'
  },
  {
    id: 'g34-2',
    lesson: 34,
    level: 'N4',
    title: 'Vた / Nの あとで',
    usage: 'Vた/Nの あto de',
    explanation: 'Sau khi làm việc A, làm việc B.',
    example: '仕事のあとで, 飲みに行きませんか。(Shigoto no ato de, nomi ni ikimasenka - Sau giờ làm đi uống chút không?)',
    category: 'Thời gian'
  },
  // Bài 35
  {
    id: 'g35-1',
    lesson: 35,
    level: 'N4',
    title: 'Thể điều kiện (V-eba)',
    usage: 'V (i -> e ba), A (i -> kereba), N (nara ba)',
    explanation: 'Giả định một điều kiện nào đó.',
    example: '安ければ、買います。(Yasukereba, kaimasu - Nếu rẻ tôi sẽ mua.)',
    category: 'Điều kiện'
  },
  {
    id: 'g35-2',
    lesson: 35,
    level: 'N4',
    title: 'Vえば Vるほど',
    usage: 'Vえば Vるほど',
    explanation: 'Càng... càng...',
    example: '日本語は勉強すればするほど面白いです。(Nihongo wa benkyou sureba suru hodo omoshiroi desu - Tiếng Nhật càng học càng thấy thú vị.)',
    category: 'So sánh lũy tiến'
  },
  // Bài 36
  {
    id: 'g36-1',
    lesson: 36,
    level: 'N4',
    title: 'Vる / Vない ように',
    usage: 'Vる/Vない ように (hành động)',
    explanation: 'Để đạt được mục đích (thường đi với động từ khả năng hoặc tự động từ).',
    example: '忘れないように、メモします。(Wasurenai youni, memo shimasu - Để không quên, tôi sẽ ghi chú lại.)',
    category: 'Mục đích'
  },
  {
    id: 'g36-2',
    lesson: 36,
    level: 'N4',
    title: 'Vる ように なります',
    usage: 'Vる ように なります',
    explanation: 'Biểu thị sự thay đổi trạng thái (trở nên có thể làm gì đó).',
    example: '日本語が話せるようになりました。(Nihongo ga hanaseru youni narimashita - Tôi đã có thể nói được tiếng Nhật rồi.)',
    category: 'Thay đổi'
  },
  // Bài 37
  {
    id: 'g37-1',
    lesson: 37,
    level: 'N4',
    title: 'Thể bị động',
    usage: 'Nhóm 1: i -> a reru; Nhóm 2: + rareru; Nhóm 3: korareru, sareru',
    explanation: 'Diễn tả hành động bị tác động bởi người khác.',
    example: '先生にほめられました。(Sensei ni homeraremashita - Tôi được thầy giáo khen.)',
    category: 'Thể bị động'
  },
  // Bài 38
  {
    id: 'g38-1',
    lesson: 38,
    level: 'N4',
    title: 'Danh từ hóa vế câu (V-no)',
    usage: 'Vる + のは/のが/のを',
    explanation: 'Biến một vế câu thành một danh từ.',
    example: 'テニスをするのは面白いです。(Tenisu o suru no wa omoshiroi desu - Việc chơi tennis rất thú vị.)',
    category: 'Danh từ hóa'
  },
  // Bài 39
  {
    id: 'g39-1',
    lesson: 39,
    level: 'N4',
    title: 'Vて / Aくて (Lý do)',
    usage: 'Vて/Aくて/Nで、～',
    explanation: 'Diễn tả nguyên nhân, lý do (thường dẫn đến kết quả không mong muốn hoặc cảm xúc).',
    example: 'ニュースを聞いて、びっくりしました。(Nyuusu o kiite, bikkuri shimashita - Nghe tin xong tôi đã rất ngạc nhiên.)',
    category: 'Nguyên nhân'
  },
  // Bài 40
  {
    id: 'g40-1',
    lesson: 40,
    level: 'N4',
    title: 'Lồng câu nghi vấn',
    usage: 'Từ để hỏi + か / ～かどうか',
    explanation: 'Lồng một câu hỏi vào trong một câu khác.',
    example: '彼が来るかどうか、わかりません。(Kare ga kuru kadouka, wakarimasen - Tôi không biết liệu anh ấy có đến hay không.)',
    category: 'Câu nghi vấn'
  },
  {
    id: 'g40-2',
    lesson: 40,
    level: 'N4',
    title: 'Vてみます',
    usage: 'Vて みます',
    explanation: 'Thử làm một việc gì đó.',
    example: 'この靴を履いてみてもいいですか。(Kono kutsu o haite mitemo ii desuka - Tôi có thể đi thử đôi giày này không?)',
    category: 'Thử nghiệm'
  },
  // Bài 41
  {
    id: 'g41-1',
    lesson: 41,
    level: 'N4',
    title: 'Cho nhận (Kính ngữ)',
    usage: '～て くださいます / ～て いただきます / ～て やります',
    explanation: 'Dạng kính ngữ và khiêm nhường ngữ của cho-nhận hành động.',
    example: '部長がレポートを直してくださいました。(Buchou ga repooto o naoshite kudasaimashita - Trưởng phòng đã sửa giúp tôi bản báo cáo.)',
    category: 'Cho nhận'
  },
  // Bài 42
  {
    id: 'g42-1',
    lesson: 42,
    level: 'N4',
    title: 'Mục đích (Vる ために)',
    usage: 'Vる / Nの ために',
    explanation: 'Diễn tả mục đích (ý chí).',
    example: '将来自分の店を持つために、貯金しています。(Shourai jibun no mise o motsu tame ni, chokin shite imasu - Để sau này có cửa hàng riêng, tôi đang tiết kiệm tiền.)',
    category: 'Mục đích'
  },
  {
    id: 'g42-2',
    lesson: 42,
    level: 'N4',
    title: 'Dùng cho / Trong việc (Vるのに)',
    usage: 'Vるのに / Nに (dùng cho/mất bao lâu/trong việc...)',
    explanation: 'Diễn tả công dụng hoặc mục đích của vật/việc.',
    example: 'このはさみは花を切るのに使います。(Kono hasami wa hana o kiru noni tsukaimasu - Cái kéo này dùng để cắt hoa.)',
    category: 'Cách dùng'
  },
  // Bài 43
  {
    id: 'g43-1',
    lesson: 43,
    level: 'N4',
    title: 'Có vẻ (V/A Sou desu)',
    usage: 'V (bỏ masu) / A (bỏ i/na) そうです',
    explanation: 'Dự đoán dựa trên vẻ bề ngoài hoặc dấu hiệu.',
    example: '今にも雨が降りそうです。(Ima nimo ame ga furisou desu - Trời có vẻ sắp mưa đến nơi rồi.)',
    category: 'Dự đoán'
  },
  {
    id: 'g43-2',
    lesson: 43,
    level: 'N4',
    title: 'Đi làm gì rồi về (V-te kimasu)',
    usage: 'Vて きます',
    explanation: 'Đi làm một việc gì đó rồi quay lại.',
    example: 'ちょっとタバコを買ってきます。(Chotto tabako o katte kimasu - Tôi đi mua thuốc lá một chút rồi về.)',
    category: 'Hành động'
  },
  // Bài 44
  {
    id: 'g44-1',
    lesson: 44,
    level: 'N4',
    title: 'Quá (V/A Sugimasu)',
    usage: 'V (bỏ masu) / A (bỏ i/na) すぎます',
    explanation: 'Diễn tả sự vượt quá mức độ bình thường (thường mang ý tiêu cực).',
    example: '昨夜お酒を飲みすぎました。(Sakuya osake o nomisugimashita - Tối qua tôi đã uống quá nhiều rượu.)',
    category: 'Mức độ'
  },
  {
    id: 'g44-2',
    lesson: 44,
    level: 'N4',
    title: 'Dễ / Khó làm gì',
    usage: 'V (bỏ masu) + やすい / にくい',
    explanation: 'Diễn tả tính chất của hành động hoặc vật.',
    example: 'このペンは書きやすいです。(Kono pen wa kakiyasui desu - Chiếc bút này dễ viết.)',
    category: 'Tính chất'
  },
  // Bài 45
  {
    id: 'g45-1',
    lesson: 45,
    level: 'N4',
    title: 'Trong trường hợp (Baai wa)',
    usage: 'V/A/N (thể thông thường) + 場合は',
    explanation: 'Giả định một tình huống cụ thể.',
    example: '火事の場合は、エレベーターを使わないでください。(Kaji no baai wa, erebeetaa o tsukawanaide kudasai - Trong trường hợp hỏa hoạn, xin đừng sử dụng thang máy.)',
    category: 'Điều kiện'
  },
  {
    id: 'g45-2',
    lesson: 45,
    level: 'N4',
    title: 'Mặc dù (Noni)',
    usage: 'V/A/N (thể thông thường) + のに',
    explanation: 'Diễn tả sự tương phản mang tính bất ngờ hoặc hối tiếc.',
    example: '約束をしたのに、彼女は来ませんでした。(Yakusoku o shita noni, kanojo wa kimasen deshita - Mặc dù đã hẹn nhưng cô ấy không đến.)',
    category: 'Nghịch lý'
  },
  // Bài 46
  {
    id: 'g46-1',
    lesson: 46,
    level: 'N4',
    title: 'Đang lúc / Vừa mới (Tokoro desu)',
    usage: 'Vる / Vている / Vた + ところです',
    explanation: 'Diễn tả các giai đoạn của hành động (sắp, đang, vừa xong).',
    example: '今、ご飯を食べるところです。(Ima, gohan o taberu tokoro desu - Bây giờ tôi sắp ăn cơm.)',
    category: 'Thời điểm'
  },
  {
    id: 'g46-2',
    lesson: 46,
    level: 'N4',
    title: 'Vừa mới (Ta-bakari)',
    usage: 'Vた ばかりです',
    explanation: 'Diễn tả hành động vừa mới xảy ra (theo cảm nhận của người nói).',
    example: 'さっき昼ご飯を食べたばかりです。(Sakki hirugohan o tabeta bakari desu - Tôi vừa mới ăn trưa xong.)',
    category: 'Thời điểm'
  },
  // Bài 47
  {
    id: 'g47-1',
    lesson: 47,
    level: 'N4',
    title: 'Nghe nói (Sou desu)',
    usage: 'V/A/N (thể thông thường) + そうです',
    explanation: 'Trình bày lại thông tin nghe được từ nguồn khác.',
    example: '天気予報によると、明日は晴れるそうです。(Tenki yohou ni yoru to, ashita wa hareru sou desu - Theo dự báo thời tiết, nghe nói ngày mai trời sẽ nắng.)',
    category: 'Trích dẫn'
  },
  {
    id: 'g47-2',
    lesson: 47,
    level: 'N4',
    title: 'Có vẻ / Hình như (You desu)',
    usage: 'V/A/N (thể thông thường) + ようです',
    explanation: 'Dự đoán dựa trên những gì mắt thấy tai nghe hoặc trải nghiệm.',
    example: '外は雨が降っているようです。(Soto wa ame ga futte iru you desu - Bên ngoài hình như trời đang mưa.)',
    category: 'Dự đoán'
  },
  // Bài 48
  {
    id: 'g48-1',
    lesson: 48,
    level: 'N4',
    title: 'Thể sai khiến (Shimeki)',
    usage: 'Nhóm 1: i -> a seru; Nhóm 2: + saseru; Nhóm 3: kosaseru, saseru',
    explanation: 'Cho phép hoặc bắt buộc ai đó làm gì.',
    example: '息子に野菜を食べさせました。(Musuko ni yasai o tabesasemashita - Tôi bắt con trai ăn rau.)',
    category: 'Thể sai khiến'
  },
  // Bài 49
  {
    id: 'g49-1',
    lesson: 49,
    level: 'N4',
    title: 'Tôn kính ngữ (Sonkeigo)',
    usage: 'Vられる / お V に なります / Đặc biệt (Irasshaimasu, v.v.)',
    explanation: 'Dùng để nâng cao hành động của người đối diện hoặc người được nhắc đến.',
    example: '先生はもうお帰りになりました。(Sensei wa mou okaeri ni narimashita - Thầy giáo đã về rồi ạ.)',
    category: 'Kính ngữ'
  },
  // Bài 50
  {
    id: 'g50-1',
    lesson: 50,
    level: 'N4',
    title: 'Khiêm nhường ngữ (Kenjougo)',
    usage: 'お V します / Đặc biệt (Mairimasu, Moushimasu, v.v.)',
    explanation: 'Dùng để hạ thấp hành động của bản thân nhằm bày tỏ sự kính trọng.',
    example: 'お荷物をお持ちしましょうか。(Onimotsu o omochishimashouka - Để tôi cầm hành lý giúp ngài nhé?)',
    category: 'Kính ngữ'
  },
];
