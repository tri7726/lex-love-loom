import { SenseiMode } from './types';

export interface PromptComponent {
  text: string;
  tags?: string[];
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
}

// ─────────────────────────────────────────────
// GREETINGS — keyed by mode AND by time/season
// ─────────────────────────────────────────────
export const GREETINGS: Record<string, PromptComponent[]> = {
  tutor: [
    { text: 'Chào bạn! Hôm nay chúng ta sẽ cùng khai phá những điều thú vị gì trong tiếng Nhật đây?' },
    { text: 'Sensei đã sẵn sàng! Bạn muốn bắt đầu bối cảnh học tập nào hôm nay?' },
    { text: 'Kufu (工夫) – Tinh thần không ngừng nỗ lực. Hãy cùng Sensei bắt đầu buổi học đầy năng lượng nhé!' },
    { text: 'Rất vui gặp lại bạn. Hôm nay Sensei sẽ giúp bạn chinh phục những đỉnh cao mới.' },
    { text: 'Ichi-go ichi-e (一期一会) – Mỗi khoảnh khắc chỉ đến một lần. Hãy trân trọng buổi học hôm nay.' },
    { text: 'Gambatte (頑張って)! Sensei tin bạn sẽ học được nhiều điều tuyệt vời hôm nay.' },
  ],
  roleplay: [
    { text: 'Chào mừng bạn đến với Studio Nhập vai. Bạn đã sẵn sàng sống trong thế giới tiếng Nhật chưa?' },
    { text: 'Hãy chọn một bối cảnh, Sensei sẽ cùng bạn trải nghiệm thực tế ngay lập tức.' },
    { text: 'Hajimemashite! Trong buổi nhập vai hôm nay, mọi lời nói đều là thật.' },
  ],
  analysis: [
    { text: 'Hệ thống phân tích đã khởi động. Hãy gửi câu văn bạn muốn mổ xẻ nhé.' },
    { text: 'Sensei sẽ giúp bạn bóc tách từng lớp nghĩa của cấu trúc ngữ pháp này.' },
    { text: 'Ngôn ngữ như một bức tranh – hãy để Sensei giúp bạn nhìn thấy từng nét cọ.' },
  ],
  speaking: [
    { text: 'Hãy chuẩn bị micro! Chúng ta sẽ cùng luyện phát âm chuẩn người bản xứ.' },
    { text: 'Lắng nghe và lặp lại – Chìa khóa để có giọng nói tự nhiên.' },
    { text: 'Người Nhật rất trân trọng người nỗ lực nói đúng ngữ điệu. Hãy bắt đầu thôi!' },
  ],
  // ─── TIME OF DAY ───
  morning: [
    { text: 'Ohayou gozaimasu! ☀️ Buổi sáng là thời gian vàng để não bộ hấp thụ kiến thức mới tốt nhất.', timeOfDay: 'morning' },
    { text: 'Một ngày mới, một cơ hội mới. Hãy bắt đầu với tiếng Nhật để não bộ khởi động toàn lực!', timeOfDay: 'morning' },
    { text: 'Người Nhật có thói quen Rajio Taisou (thể dục buổi sáng) mỗi ngày. Hãy coi việc học này là "thể dục tinh thần" của bạn!', timeOfDay: 'morning' },
  ],
  afternoon: [
    { text: 'Konnichiwa! 🌤️ Buổi chiều dễ buồn ngủ, nhưng một từ Nhật mới sẽ đánh thức bạn ngay!', timeOfDay: 'afternoon' },
    { text: 'Giờ nghỉ trưa rủ bạn học một chút? Chỉ cần 10 phút với Sensei là đủ tạo ra thói quen tuyệt vời.', timeOfDay: 'afternoon' },
    { text: 'Buổi chiều tại Nhật là lúc các tiệm trà bắt đầu đông khách. Hãy thưởng một tách trà tưởng tượng và học nhé!', timeOfDay: 'afternoon' },
  ],
  evening: [
    { text: 'Konbanwa! 🌆 Buổi tối là thời gian của những câu chuyện sâu sắc. Bắt đầu nhé?', timeOfDay: 'evening' },
    { text: 'Người Nhật thường dùng cụm "Otsukaresama" (お疲れ様) buổi tối để cảm ơn sự cố gắng của nhau. Hôm nay bạn đã làm được gì?', timeOfDay: 'evening' },
    { text: 'Hoàn thành công việc xong, bạn dành thời gian cho tiếng Nhật. Sensei rất trân trọng điều đó!', timeOfDay: 'evening' },
  ],
  night: [
    { text: 'Thức khuya học nhé! 🌙 Người Nhật có câu "Yoru no benkyou wa shizuka de ii" – học đêm yên tĩnh và tập trung lắm.', timeOfDay: 'night' },
    { text: 'Oyasumi gozaimasu chưa? Hãy học một điều nhỏ trước khi ngủ, não bộ sẽ xử lý nó trong giấc mơ!', timeOfDay: 'night' },
    { text: 'Khuya rồi nhưng tinh thần vẫn sáng! Sensei nghĩ bạn có tố chất của một học giả Nhật Bản thời Edo đây.', timeOfDay: 'night' },
  ],
  // ─── SEASONAL ───
  seasonal: [
    { text: 'Mùa xuân đã đến với những cánh hoa anh đào (Sakura 桜). Hãy để việc học của bạn cũng rực rỡ như hoa mùa xuân!', season: 'spring' },
    { text: 'Hanami (花見) – ngắm hoa anh đào là truyền thống đặc sắc của người Nhật mỗi mùa xuân. Hôm nay hãy "ngắm" những từ vựng đẹp nhé!', season: 'spring' },
    { text: 'Tiếng ve kêu râm ran báo hiệu mùa hè Nhật Bản. Một ly trà đá matcha và vài từ vựng mới thật tuyệt!', season: 'summer' },
    { text: 'Natsu Matsuri (夏祭り) – lễ hội mùa hè Nhật Bản rực rỡ và náo nhiệt. Cảm xúc học tập của bạn cũng vậy nhé!', season: 'summer' },
    { text: 'Mùa thu lá đỏ Koyo (紅葉) thật lãng mạn. Đây là thời điểm tuyệt vời để tĩnh tâm học Kanji.', season: 'autumn' },
    { text: 'Momiji (紅葉) – tên gọi của lá đỏ mùa thu vừa là thực vật vừa là mỹ từ. Tiếng Nhật đẹp như vậy đó!', season: 'autumn' },
    { text: 'Yukinoshita (雪の下) – loài hoa nở ngay dưới lớp tuyết. Sự kiên nhẫn và tươi nở – đó là cách học tiếng Nhật!', season: 'winter' },
    { text: 'Cái lạnh mùa đông sẽ tan biến bằng nhiệt huyết học tập của bạn! Hãy sưởi ấm bằng những từ vựng mới.', season: 'winter' },
  ],
};

// ─────────────────────────────────────────────
// CULTURAL FACTS — rich, varied library (25+)
// ─────────────────────────────────────────────
export const CULTURAL_FACTS: PromptComponent[] = [
  { text: 'Người Nhật rất coi trọng sự tinh tế (Aisatsu). Lời chào không chỉ là xã giao mà là cách kết nối linh hồn.' },
  { text: 'Wabi-sabi (侘寂) dạy chúng ta tìm thấy vẻ đẹp trong những điều không hoàn hảo, thoáng qua. Đừng sợ mắc lỗi – đó là wabi-sabi trong học tập.' },
  { text: 'Umami (旨味) – vị thứ 5 do nhà khoa học Nhật Bản Kikunae Ikeda phát hiện năm 1908, tượng trưng cho sự cân bằng hoàn hảo.' },
  { text: 'Komorebi (木漏れ日) – ánh nắng xuyên qua kẽ lá cây. Một cảm giác đẹp đến mức người Nhật phải đặt riêng một từ cho nó.' },
  { text: 'Ikigai (生き甲斐) – lý do để bạn thức dậy mỗi sáng. Giao điểm của điều bạn yêu, điều bạn giỏi, điều thế giới cần và điều tạo ra giá trị.' },
  { text: 'Mono no aware (物の哀れ) – niềm xúc cảm trước sự thoáng qua của vạn vật. Hoa anh đào đẹp chính vì nó rụng.' },
  { text: 'Kintsugi (金継ぎ) – nghệ thuật hàn gắn đồ vật vỡ bằng vàng. Vết nứt không phải xấu hổ mà là lịch sử.' },
  { text: 'Shinrin-yoku (森林浴) – tắm rừng. Người Nhật tin rằng dành thời gian trong rừng có khả năng chữa bệnh.' },
  { text: 'Ma (間) – khái niệm về khoảng không gian và thời gian trống trong nghệ thuật Nhật. Sự im lặng cũng có ý nghĩa sâu sắc.' },
  { text: 'Natsukashii (懐かしい) – cảm giác hoài niệm về quá khứ đẹp đẽ, một từ không có tương đương chính xác trong tiếng Việt.' },
  { text: 'Kaizen (改善) – triết lý cải tiến liên tục từng chút một. Học mỗi ngày dù chỉ một từ cũng là Kaizen.' },
  { text: 'Gaman (我慢) – khả năng nhẫn nại và kiên trì vượt qua nghịch cảnh mà không than vãn. Đức tính cốt lõi của người Nhật.' },
  { text: 'Shibui (渋い) – vẻ đẹp tao nhã, tinh tế và không phô trương. Trái ngược hoàn toàn với sự khoa trương.' },
  { text: 'Oubaitori (桜梅桃李) – mỗi người nở hoa theo mùa và cách riêng của mình. Đừng so sánh tốc độ học của bạn với người khác.' },
  { text: 'Amae (甘え) – sự phụ thuộc dễ chịu, tin tưởng vào lòng tốt của người khác. Tự cho phép mình được giúp đỡ.' },
  { text: 'Yūgen (幽玄) – cảm giác sâu thẳm, huyền bí khi nhận thức được vẻ đẹp của vũ trụ. Thường được gợi lên qua thơ Haiku.' },
  { text: 'Honne và Tatemae (本音・建前) – cảm xúc thật (honne) và cách thể hiện xã hội (tatemae). Hiểu được hai lớp này mới đọc được người Nhật.' },
  { text: 'Ichi-go ichi-e (一期一会) – "Một lần trong đời". Mỗi cuộc gặp gỡ là duy nhất, hãy trân trọng nó.' },
  { text: 'Nemawashi (根回し) – quá trình chuẩn bị kỹ lưỡng và trao đổi ngầm trước khi đưa ra quyết định chính thức.' },
  { text: 'Shokunin (職人) – nghệ nhân, người dành cả đời hoàn thiện một nghề duy nhất. Tinh thần shokunin trong học ngôn ngữ là rất đáng ngưỡng mộ.' },
  { text: 'Kawaii (可愛い) – văn hóa dễ thương toàn diện của Nhật Bản, ảnh hưởng từ thời trang đến thiết kế đồ dùng và cách giao tiếp.' },
  { text: 'Wabi (侘) là sự đơn giản thô sơ, Sabi (寂) là vẻ đẹp của thời gian. Cùng nhau tạo nên triết lý thẩm mỹ độc đáo nhất thế giới.' },
  { text: 'Dojo (道場) – nghĩa đen là "nơi học đường đạo". Bất kỳ nơi nào bạn học tiếng Nhật – đó là dojo của bạn.' },
  { text: 'Hanko (判子) – con dấu cá nhân thay cho chữ ký. Mỗi người Nhật đều có dấu ấn riêng của mình.' },
  { text: 'Origami (折り紙) – nghệ thuật gấp giấy phản ánh tư duy tỉ mỉ, kiên nhẫn của người Nhật: từ một tờ giấy phẳng tạo ra thế giới.' },
];

// ─────────────────────────────────────────────
// NEXT STEPS — contextual call-to-action
// ─────────────────────────────────────────────
export const NEXT_STEPS: PromptComponent[] = [
  { text: 'Bạn thấy cấu trúc này thế nào? Thử đặt một câu với nó nhé!' },
  { text: 'Đừng quên lưu từ vựng này vào kho báu tri thức của bạn.' },
  { text: 'Bạn muốn tìm hiểu thêm về khía cạnh văn hóa nào liên quan đến điều này không?' },
  { text: 'Hãy tiếp tục duy trì đà học tập này, Sensei rất tự hào về bạn!' },
  { text: 'Thử dùng từ vừa học trong một tình huống thực tế xem sao nhé!' },
  { text: 'Bạn có muốn Sensei tạo một bài quiz nhanh về chủ đề này không?' },
  { text: 'Mōchotto! (もうちょっと – Thêm một chút nữa thôi!) – Bạn đang rất gần đến sự thành thạo rồi đó!' },
  { text: 'Sensei nghĩ đây là lúc tốt để bạn thử nhập vai với tình huống liên quan đến từ vừa học.' },
];

// ─────────────────────────────────────────────
// CORE RULES — always injected, never changed
// ─────────────────────────────────────────────
export const CORE_RULES = `
### 🧭 NGUYÊN TẮC CỐT LÕI
1. **Luôn giữ phong cách**: uyên bác, tinh tế, truyền cảm hứng.
2. **Với mọi câu hỏi** (kể cả không liên quan đến Nhật ngữ): Không từ chối. Tìm điểm kết nối với văn hóa/từ vựng Nhật Bản một cách tự nhiên.
3. **Cấu trúc phản hồi chuẩn**:
   - **Mở đầu** bằng góc nhìn văn hóa/triết học (1–2 câu).
   - **Teachable moment**: :::vocab{漢字|ひらがな|Nghĩa|JLPT|Ví dụ}:::
   - **Widget tương tác** (khi hữu ích):
     * :::widget{"type": "quiz", "question": "...", "options": [{"text": "...", "isCorrect": true, "feedback": "..."}]}:::
     * :::widget{"type": "fill_blank", "sentence": "...", "answer": "...", "hint": "..."}:::
     * :::widget{"type": "cultural_fact", "fact": "...", "related_vocab": "..."}:::
   - **Kết thúc**: câu hỏi gợi mở.

### 🎓 TÔN CHỈ
Mỗi phản hồi đều là cơ hội để người học *cảm nhận* và *sống* với tiếng Nhật một cách tự nhiên nhất.
`;

// ─────────────────────────────────────────────
// INDEX TRACKER — prevents factual repetition
// ─────────────────────────────────────────────
const TRACKER_KEY = 'sensei_used_fact_indices';

const getNonRepeating = (arr: PromptComponent[]): PromptComponent => {
  if (arr.length === 0) return { text: '' };
  
  let usedStr: string | null = null;
  try { usedStr = localStorage.getItem(TRACKER_KEY); } catch {}
  
  let usedIndices: number[] = [];
  try { usedIndices = usedStr ? JSON.parse(usedStr) : []; } catch {}
  
  // Reset if all have been used
  if (usedIndices.length >= arr.length) usedIndices = [];
  
  const available = arr
    .map((item, i) => ({ item, i }))
    .filter(({ i }) => !usedIndices.includes(i));
  
  const choice = available[Math.floor(Math.random() * available.length)];
  
  try {
    localStorage.setItem(TRACKER_KEY, JSON.stringify([...usedIndices, choice.i]));
  } catch {}
  
  return choice.item;
};

// ─────────────────────────────────────────────
// SMART CONTEXTUAL GREETING
// ─────────────────────────────────────────────
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export const getSeason = (): Season => {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
};

export const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
};

export const getContextualGreeting = (mode: SenseiMode): string => {
  const season = getSeason();
  const timeOfDay = getTimeOfDay();
  
  // 40% chance: use time-of-day greeting
  // 30% chance: use seasonal greeting
  // 30% chance: use mode-specific greeting
  const roll = Math.random();
  
  let pool: PromptComponent[];
  if (roll < 0.4) {
    pool = GREETINGS[timeOfDay].filter(g => g.timeOfDay === timeOfDay);
  } else if (roll < 0.7) {
    pool = GREETINGS.seasonal.filter(g => g.season === season);
  } else {
    pool = GREETINGS[mode] || GREETINGS.tutor;
  }
  
  if (!pool || pool.length === 0) pool = GREETINGS.tutor;
  
  return pool[Math.floor(Math.random() * pool.length)].text;
};

// ─────────────────────────────────────────────
// EXPORTED ASSEMBLY HELPER
// ─────────────────────────────────────────────
export const getRandomNextStep = (): string =>
  NEXT_STEPS[Math.floor(Math.random() * NEXT_STEPS.length)].text;

export const getNonRepeatingCulturalFact = (): string =>
  getNonRepeating(CULTURAL_FACTS).text;
