export interface StoryStage {
  id: string;
  type: 'dialogue' | 'quiz' | 'action';
  character?: 'Sensei' | 'Officer' | 'Player' | 'Staff';
  mood?: 'neutral' | 'happy' | 'thinking' | 'surprised' | 'serious' | 'error';
  text: string;
  jpText?: string;
  audioUrl?: string;
  isHellMode?: boolean;
  isBoss?: boolean;
  bossHP?: number;
  question?: {
    id: string;
    type: 'choice' | 'input';
    text: string;
    options: {
      id: string;
      text: string;
      isCorrect: boolean;
      nextStageId?: string;
    }[];
    explanation: string;
  };
  nextStageId?: string;
  source?: string;
}

export interface Episode {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  source?: string;
  stages: StoryStage[];
}

export const STORY_EPISODES: Episode[] = [
  {
    id: 1,
    title: "Narita Arrival",
    description: "Nhập cảnh và bắt đầu hành trình tại Nhật Bản.",
    difficulty: "N5",
    source: "Notebook N5",
    stages: [
      {
        id: 's1',
        type: 'dialogue',
        character: 'Sensei',
        mood: 'happy',
        text: 'Chào bạn! Chào mừng đến với sân bay Narita. Bạn đã sẵn sàng cho chuyến hành trình tại Nhật Bản chưa?',
        jpText: '成田空港[なりたくうこう]へようこそ！日本[にほん]での旅[たび]の準備[じゅんび]はいいですか？',
      },
      {
        id: 's2',
        type: 'dialogue',
        character: 'Officer',
        text: 'Chào buổi sáng. Xin hãy xuất trình hộ chiếu.',
        jpText: 'おはようございます。パスポート[ぱすぽーと]をお願[ねが]いします。',
      },
      {
        id: 's3',
        type: 'quiz',
        character: 'Officer',
        text: 'Họ hỏi bạn: "O-namae wa nan desu ka?". Bạn nên viết tên mình như thế nào?',
        question: {
          id: 'q1',
          type: 'input',
          text: 'Pheo',
          options: [],
          explanation: '"O-namae (お名前)" là tên. Bạn nên nhập tên mình một cách rõ ràng. Trong tình huống này, ta dùng "Pheo desu".',
        },
      },
      {
        id: 's4',
        type: 'dialogue',
        character: 'Officer',
        text: 'Bạn đến Nhật Bản với mục đích gì?',
        jpText: '日本への入国目的は何ですか？',
      },
      {
        id: 's5',
        type: 'quiz',
        character: 'Sensei',
        text: 'Bạn đến để du lịch. Hãy chọn câu trả lời chính xác nhất:',
        question: {
          id: 'q2',
          type: 'choice',
          text: 'Mục đích của tôi là du lịch.',
          options: [
            { id: '1', text: '観光です (Kankou desu)', isCorrect: true },
            { id: '2', text: '勉強です (Benkyou desu)', isCorrect: false },
            { id: '3', text: '仕事です (Shigoto desu)', isCorrect: false },
          ],
          explanation: '"観光 (Kankou)" nghĩa là tham quan/du lịch. Đây là từ khóa quan trọng khi nhập cảnh.',
        },
      },
      {
        id: 's6',
        type: 'dialogue',
        character: 'Officer',
        text: 'Bạn sẽ ở đây trong bao lâu?',
        jpText: 'どのくらい滞在しますか？',
      },
      {
        id: 's7',
        type: 'quiz',
        character: 'Player',
        text: 'Hãy nhập số ngày bạn dự định ở lại (10 ngày) bằng Romaji:',
        question: {
          id: 'q3',
          type: 'input',
          text: 'juukakkan',
          options: [],
          explanation: '"Gưi/Khoảng" là "~gurai", nhưng "trong 10 ngày" chính xác là "Tookan" hoặc "Juukakkan".',
        },
      },
      {
        id: 's8',
        type: 'quiz',
        character: 'Officer',
        isHellMode: true,
        text: 'THỬ THÁCH CUỐI CÙNG (HELL MODE): Giải thích về nơi cư trú.',
        question: {
          id: 'q4',
          type: 'choice',
          text: 'Tôi sẽ ở khách sạn tại Shinjuku.',
          options: [
            { id: '1', text: '新宿のホテルに泊まります。', isCorrect: true },
            { id: '2', text: '新宿のホテルへ行きます。', isCorrect: false },
            { id: '3', text: 'ホテルは新宿にあります。', isCorrect: false },
          ],
          explanation: '"泊まります (Tomarimasu)" là động từ chính xác để nói về việc trú lại tại một nơi.',
        },
      },
      {
        id: 's9-boss',
        type: 'quiz',
        character: 'Officer',
        isBoss: true,
        bossHP: 100,
        text: 'TRẬN ĐẤU TRÙM: NHẬP CẢNH CUỐI CÙNG! Nhân viên yêu cầu bạn tổng kết lại tất cả. "Tại sao bạn lại đến Nhật Bản và bạn sẽ ở đâu?"',
        question: {
          id: 'q-boss-1',
          type: 'choice',
          text: 'Chọn câu trả lời đầy đủ và chính xác nhất:',
          options: [
            { id: 'b1', text: '観光です。新宿のホテルに泊まります。', isCorrect: true },
            { id: 'b2', text: '仕事です。ホテルへ行きます。', isCorrect: false },
            { id: 'b3', text: '観光です。友達の家にいます。', isCorrect: false },
          ],
          explanation: 'Chúc mừng! Bạn đã vượt qua thử thách cuối cùng của Sân bay Narita!',
        },
      },
    ],
  },
  {
    id: 2,
    title: "The Journey to Tokyo",
    description: "Di chuyển đến trung tâm Tokyo và nhận phòng khách sạn.",
    difficulty: "N5",
    stages: [
      {
        id: 's2-1',
        type: 'dialogue',
        character: 'Player',
        text: 'Bây giờ mình cần tìm quầy vé tàu điện để về Tokyo.',
        jpText: '東京行きのチケット売り場を探さないと. ',
      },
      {
        id: 's2-2',
        type: 'quiz',
        character: 'Sensei',
        text: 'Làm sao để hỏi: "Bán vé ở đâu vậy?"',
        question: {
          id: 'q2-1',
          type: 'choice',
          text: 'Quầy vé ở đâu?',
          options: [
            { id: '1', text: '切符売り場はどこですか。', isCorrect: true },
            { id: '2', text: '駅はあそこです。', isCorrect: false },
            { id: '3', text: 'チケットをください。', isCorrect: false },
          ],
          explanation: '"~はどこですか" là mẫu câu hỏi vị trí cơ bản nhất.',
        },
      },
      {
        id: 's2-3',
        type: 'dialogue',
        character: 'Officer',
        text: 'Vâng, quầy vé ở đằng kia ạ.',
        jpText: '切符売り場はあちらです。',
      },
      {
        id: 's2-4',
        type: 'quiz',
        character: 'Player',
        text: 'Hãy nhập từ "Xe điện" bằng Romaji để yêu cầu mua vé:',
        question: {
          id: 'q2-2',
          type: 'input',
          text: 'densha',
          options: [],
          explanation: '"Densha (電車)" là xe điện, phương tiện phổ biến nhất để về Tokyo từ Narita.',
        },
      },
      {
        id: 's2-5',
        type: 'dialogue',
        character: 'Sensei',
        text: 'Đã đến khách sạn rồi. Hãy cùng làm thủ tục nhận phòng thôi.',
        jpText: 'ホテルに着きましたね。チェックインしましょう。',
      },
      {
        id: 's2-6',
        type: 'quiz',
        character: 'Officer',
        text: 'Nhân viên yêu cầu bạn viết địa chỉ:',
        question: {
          id: 'q2-3',
          type: 'choice',
          text: 'Xin hãy viết địa chỉ vào đây.',
          options: [
            { id: '1', text: 'ここに住所を書いてください。', isCorrect: true },
            { id: '2', text: 'ここに名前を書いてください。', isCorrect: false },
            { id: '3', text: '住所を教えてください。', isCorrect: false },
          ],
          explanation: '"住所 (Juusho)" là địa chỉ. "~を書いてください" là cấu trúc yêu cầu lịch sự.',
        },
      },
      {
        id: 's2-7',
        type: 'dialogue',
        character: 'Officer',
        text: 'Phòng của bạn ở tầng 5.',
        jpText: 'お部屋は5階です。',
      },
      {
        id: 's2-8',
        type: 'quiz',
        character: 'Officer',
        isHellMode: true,
        text: 'THỬ THÁCH CUỐI CÙNG (HELL MODE): Hỏi về giờ ăn sáng.',
        question: {
          id: 'q2-4',
          type: 'choice',
          text: 'Bữa sáng bắt đầu từ mấy giờ?',
          options: [
            { id: '1', text: '朝食は何時からですか。', isCorrect: true },
            { id: '2', text: '朝食は何時までですか。', isCorrect: false },
            { id: '3', text: '朝食を食べましたか。', isCorrect: false },
          ],
          explanation: '"朝食 (Choushoku)" là bữa sáng. "何時から (Nanji kara)" là từ mấy giờ.',
        },
      },
    ],
  },
  {
    id: 3,
    title: "Gourmet Adventure",
    description: "Trải nghiệm văn hóa ẩm thực Nhật Bản tại một quán Ramen ở Shinjuku.",
    difficulty: "N5",
    stages: [
      {
        id: 's3-1',
        type: 'dialogue',
        character: 'Sensei',
        text: 'Quán Ramen này rất nổi tiếng. Chúng ta cùng vào gọi món nhé.',
        jpText: 'このラーメン屋はとても有名ですよ。入りましょう。',
      },
      {
        id: 's3-2',
        type: 'quiz',
        character: 'Player',
        text: 'Bạn muốn gọi một bát Ramen. Hãy nhập từ "Ramen" bằng Hiragana hoặc Romaji:',
        question: {
          id: 'q3-1',
          type: 'input',
          text: 'ra-men',
          options: [],
          explanation: '"ラーメン (Ra-men)" thường được viết bằng Katakana, nhưng nhập Romaji vẫn được chấp nhận ở đây.',
        },
      },
      {
        id: 's3-3',
        type: 'quiz',
        character: 'Staff',
        text: 'Nhân viên hỏi bạn có uống nước không?',
        question: {
          id: 'q3-2',
          type: 'choice',
          text: 'Cho tôi một ly nước.',
          options: [
            { id: '1', text: 'お水を一つください。', isCorrect: true },
            { id: '2', text: 'お茶を飲みます。', isCorrect: false },
            { id: '3', text: 'お水はいくらですか。', isCorrect: false },
          ],
          explanation: '"お水 (O-mizu)" là nước. Trong quán ăn Nhật, nước thường được phục vụ miễn phí.',
        },
      },
      {
        id: 's3-4',
        type: 'dialogue',
        character: 'Staff',
        text: 'Chúc quý khách ngon miệng.',
        jpText: 'ごゆっくりどうぞ。',
      },
      {
        id: 's3-5',
        type: 'quiz',
        character: 'Player',
        text: 'Sau khi ăn xong, bạn muốn khen món ăn ngon:',
        question: {
          id: 'q3-3',
          type: 'choice',
          text: 'Ramen thật là ngon!',
          options: [
            { id: '1', text: 'ラーメンはとても美味しかったです。', isCorrect: true },
            { id: '2', text: 'ラーメンは高いですが、いいです。', isCorrect: false },
            { id: '3', text: 'ラーメンをもう一度食べます。', isCorrect: false },
          ],
          explanation: '"美味しい (Oishii)" là ngon. Dùng thì quá khứ "Deshita" vì đã ăn xong.',
        },
      },
      {
        id: 's3-6',
        type: 'dialogue',
        character: 'Sensei',
        text: 'Đừng quên nói câu cảm ơn sau khi ăn xong nhé.',
        jpText: '食べ終わったら,「ごちそうさまでした」と言いましょう。',
      },
      {
        id: 's3-7',
        type: 'quiz',
        character: 'Player',
        text: 'Hãy nhập cụm từ "Cảm ơn vì bữa ăn" (Gochisousama) bằng Romaji:',
        question: {
          id: 'q3-4',
          type: 'input',
          text: 'gochisousama',
          options: [],
          explanation: '"ごちそうさま (Gochisousama)" là câu lịch sự dùng sau khi ăn.',
        },
      },
      {
        id: 's3-8',
        type: 'quiz',
        character: 'Staff',
        isHellMode: true,
        text: 'THỬ THÁCH CUỐI CÙNG (HELL MODE): Thanh toán bằng thẻ.',
        question: {
          id: 'q3-5',
          type: 'choice',
          text: 'Tôi có thể thanh toán bằng thẻ tín dụng không?',
          options: [
            { id: '1', text: 'クレジットカードで払えますか。', isCorrect: true },
            { id: '2', text: 'カードはどこにありますか。', isCorrect: false },
            { id: '3', text: 'カードを持っていません。', isCorrect: false },
          ],
          explanation: '"払えますか (Haraemasu ka)" là thể khả năng của "Haraimasu" (thanh toán).',
        },
      },
    ],
  },
  {
    id: 4,
    title: "Akihabara Shopping",
    description: "Khám phá thiên đường điện tử và anime Akihabara.",
    difficulty: "N5",
    stages: [
      {
        id: 's4-1',
        type: 'dialogue',
        character: 'Sensei',
        text: 'Chào mừng đến với Akihabara! Bạn muốn mua gì ở đây?',
        jpText: '秋葉原へようこそ！何を買いたいですか？',
      },
      {
        id: 's4-2',
        type: 'quiz',
        character: 'Player',
        text: 'Hãy nhập tên một thiết bị bạn muốn mua: "Máy ảnh" (Kamera):',
        question: {
          id: 'q4-1',
          type: 'input',
          text: 'kamera',
          options: [],
          explanation: '"カメラ (Kamera)" là máy ảnh. Một mặt hàng rất được ưa chuộng tại đây.',
        },
      },
      {
        id: 's4-3',
        type: 'dialogue',
        character: 'Staff',
        text: 'Chiếc máy ảnh này mẫu mới nhất, tính năng rất tốt.',
        jpText: 'このカメラは最新モデルで,とてもいいですよ。',
      },
      {
        id: 's4-4',
        type: 'quiz',
        character: 'Player',
        text: 'Bạn muốn xem thử món hàng. Hãy chọn câu hỏi đúng:',
        question: {
          id: 'q4-2',
          type: 'choice',
          text: 'Xin hãy cho tôi xem cái này.',
          options: [
            { id: '1', text: 'これを見せてください。', isCorrect: true },
            { id: '2', text: 'これを貸してください。', isCorrect: false },
            { id: '3', text: 'これを買ってください。', isCorrect: false },
          ],
          explanation: '"~を見せてください" dùng khi muốn nhờ người bán hàng lấy đồ cho xem.',
        },
      },
      {
        id: 's4-5',
        type: 'quiz',
        character: 'Staff',
        text: 'Nhân viên nói: "Kono kamera wa go-man-en desu". Giá của nó là bao nhiêu?',
        question: {
          id: 'q4-3',
          type: 'choice',
          text: 'Chọn mức giá đúng:',
          options: [
            { id: '1', text: '50.000 Yên', isCorrect: true },
            { id: '2', text: '5.000 Yên', isCorrect: false },
            { id: '3', text: '500.000 Yên', isCorrect: false },
          ],
          explanation: '"万 (Man)" là đơn vị 10.000. "五万 (Go-man)" là 50.000.',
        },
      },
      {
        id: 's4-6',
        type: 'dialogue',
        character: 'Sensei',
        text: 'Nó hơi đắt một chút nhỉ? Bạn có muốn thử hỏi về giảm giá không?',
        jpText: 'ちょっと高いですね。セールはないですか？',
      },
      {
        id: 's4-7',
        type: 'quiz',
        character: 'Player',
        text: 'Hãy nhập cụm từ "Rẻ" (Yasui) bằng Romaji:',
        question: {
          id: 'q4-4',
          type: 'input',
          text: 'yasui',
          options: [],
          explanation: '"安い (Yasui)" là rẻ, trái nghĩa với "高い (Takai)".',
        },
      },
      {
        id: 's4-8',
        type: 'quiz',
        character: 'Staff',
        isHellMode: true,
        text: 'THỬ THÁCH CUỐI CÙNG (HELL MODE): Thủ tục miễn thuế cho du khách.',
        question: {
          id: 'q4-5',
          type: 'choice',
          text: 'Cần những gì để làm thủ tục miễn thuế?',
          options: [
            { id: '1', text: 'パスポートが必要です。', isCorrect: true },
            { id: '2', text: 'チケットが必要です。', isCorrect: false },
            { id: '3', text: 'お金は必要ありません。', isCorrect: false },
          ],
          explanation: '"必要 (Hitsuyou)" là cần thiết. "パスポート (Pasupo-to)" là hộ chiếu.',
        },
      },
    ],
  }
];
