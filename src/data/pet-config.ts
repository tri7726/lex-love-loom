export type PetMood = 'happy' | 'content' | 'hungry' | 'tired' | 'sad';

export function getPetMood(happiness: number, hunger: number, energy: number): PetMood {
  if (happiness >= 70 && hunger >= 50 && energy >= 50) return 'happy';
  if (happiness >= 40 && hunger >= 30 && energy >= 30) return 'content';
  if (hunger < 30) return 'hungry';
  if (energy < 30) return 'tired';
  return 'sad';
}

export interface PetTypeConfig {
  id: string;
  name: string;
  description: string;
  emoji: string; // base emoji for selection
  moodEmojis: Record<PetMood, string>; // mood-based emojis
  gradient: string; // tailwind gradient for cards
  color: string; // tailwind text color class
  bgColor: string; // tailwind bg class
  borderColor: string; // tailwind border class
  ringColor: string;
  personality: string[];
  messages: {
    idle: string[];
    happy: string[];
    sad: string[];
    evolution: string[];
    feed: string[];
    pet: string[];
    conversation: {
      greeting: string[];
      study: string[];
      mood: string[];
      story: string[];
      bye: string[];
      free: string[];
    };
  };
  stages: string; // description of evolution path for selection display
}

export const PET_TYPES: Record<string, PetTypeConfig> = {
  kitune: {
    id: 'kitune',
    name: 'Kitsune',
    description: 'Cáo thần thoại Nhật Bản — từ quả trứng huyền bí hóa thành Cửu Vĩ Hồ uy nghi.',
    emoji: '🦊',
    moodEmojis: { happy: '🦊', content: '🦊✨', hungry: '🦊💦', tired: '🦊😴', sad: '🦊💧' },
    gradient: 'from-orange-400 to-rose-500',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    ringColor: 'ring-orange-300',
    personality: ['Tinh nghịch', 'Thông minh', 'Trung thành', 'Bí ẩn'],
    messages: {
      idle: [
        'Cậu ơi, hôm nay học gì thế?',
        'Mình cùng nhau cố gắng nhé!',
        'Tớ đang chờ cậu học bài nè!',
        'Học tập là niềm vui mà!',
        'Cậu có mệt không? Nghỉ một chút nhé!',
        'Tớ tin cậu sẽ làm được!',
      ],
      happy: [
        'Cảm ơn cậu! Tớ vui lắm!',
        'Cậu là người bạn tuyệt nhất!',
        'Hôm nay thật là một ngày tuyệt vời!',
        'Tớ thích ở bên cậu!',
      ],
      sad: [
        'Cậu ơi... tớ nhớ cậu...',
        'Hức hức... tớ buồn quá...',
        'Cậu đến chơi với tớ đi...',
      ],
      evolution: [
        'Tớ mạnh mẽ hơn rồi! Cảm ơn cậu!',
        'Oa! Tớ lên cấp rồi! Cùng nhau tiến bộ nhé!',
        'Sức mạnh mới! Cảm ơn cậu đã đồng hành!',
      ],
      feed: [
        'Ngon quá! Cảm ơn cậu!',
        'Tớ thích món này lắm!',
        'Ăn ngon quá! Cậu thử không?',
      ],
      pet: [
        'Hehe... nhột quá!',
        'Tớ thích được cưng nắm!',
        'Ấm áp quá đi...',
      ],
      conversation: {
        greeting: ['Chào cậu! Hôm nay cậu thế nào?', 'Lâu quá mới gặp!', 'Cậu đến rồi, tớ nhớ cậu lắm!'],
        study: ['Học hăng hái thế! Cùng nhau tiến bộ nhé!', 'Học gì thế? Cho tớ học với!'],
        mood: ['Tớ vui lắm khi ở bên cậu!', 'Khỏe re, còn cậu thì sao?'],
        story: ['Có một lần tớ thấy một cây sakura rất đẹp... Rồi tớ gặp cậu!', 'Kể về cửu vĩ hồ nhé...'],
        bye: ['Tạm biệt cậu! Nhớ quay lại sớm nhé!', 'Hẹn gặp lại! Tớ sẽ chờ cậu!'],
        free: ['Hihi, thú vị đấy!', 'Cậu nói hay quá! Kể tiếp đi!', 'Tớ thích nghe cậu nói chuyện lắm!'],
      },
    },
    stages: '🥚 → 🦊 → 🦊✨ → 🦊🔥',
  },
  ryu: {
    id: 'ryu',
    name: 'Ryu',
    description: 'Rồng linh thiêng — từ trứng rồng nở thành Tatsu rồi hóa Rồng Thần uy mãnh.',
    emoji: '🐉',
    moodEmojis: { happy: '🐉', content: '🐉✨', hungry: '🐉💦', tired: '🐉😴', sad: '🐉💧' },
    gradient: 'from-cyan-500 to-blue-700',
    color: 'text-primary',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    ringColor: 'ring-cyan-300',
    personality: ['Mạnh mẽ', 'Quyết tâm', 'Linh thiêng', 'Bảo vệ'],
    messages: {
      idle: [
        'Ta sẽ bảo vệ cậu!',
        'Học thôi nào! Tiến lên!',
        'Không gì là không thể!',
        'Cậu có thấy ta mạnh hơn không?',
        'Cố lên! Ta luôn ở đây!',
      ],
      happy: [
        'Hahaha! Cảm giác thật tuyệt!',
        'Cậu làm ta vui lắm đó!',
        'Năng lượng tràn đầy!',
      ],
      sad: [
        'Ta cảm thấy yếu đi mất...',
        'Hãy đến với ta sớm nhé...',
        'Cậu bỏ rơi ta rồi sao...',
      ],
      evolution: [
        'TA TIẾN HÓA! Cảm ơn cậu!',
        'Sức mạnh mới đang chảy trong huyết mạch!',
        'Cùng nhau vươn tới đỉnh cao!',
      ],
      feed: [
        'Tràn đầy năng lượng!',
        'Bữa ăn thật hoành tráng!',
        'Ta thích đồ ăn Nhật lắm!',
      ],
      pet: [
        'Hừm... cũng dễ chịu phết...',
        'Đừng nói với ai là ta thích nhé!',
        'Grừ... được lắm...',
      ],
      conversation: {
        greeting: ['Ha! Lại gặp nhau rồi! Chuẩn bị chinh phục đỉnh cao nhé!', 'Ta đã chờ cậu! Cùng lên đường thôi!'],
        study: ['Mạnh mẽ lên! Học là vũ khí mạnh nhất!', 'Chăm chỉ thế! Ta tự hào về cậu!'],
        mood: ['Ta cảm thấy đầy năng lượng!', 'Rất tốt! Vững như núi!'],
        story: ['Ngày xửa ngày xưa, một con rồng... à, chính là ta!', 'Sức mạnh của rồng đến từ lòng quyết tâm!'],
        bye: ['Tạm biệt! Hãy trở về mạnh mẽ hơn nhé!', 'Ta chờ cậu quay lại! Đừng để ta đợi lâu!'],
        free: ['Ngươi nói có lý!', 'Hừm... ta ghi nhận điều đó!', 'Ha ha! Thú vị đấy!'],
      },
    },
    stages: '🥚 → 🐉 → 🐉✨ → 🐉🔥',
  },
  kappa: {
    id: 'kappa',
    name: 'Kappa',
    description: 'Linh vật nước Nhật Bản — từ nòng nọc bé nhỏ hóa Đại Kappa tinh nghịch.',
    emoji: '🐢',
    moodEmojis: { happy: '🐢', content: '🐢✨', hungry: '🐢💦', tired: '🐢😴', sad: '🐢💧' },
    gradient: 'from-emerald-400 to-teal-600',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    ringColor: 'ring-emerald-300',
    personality: ['Vui vẻ', 'Tò mò', 'Hài hước', 'Thích nước'],
    messages: {
      idle: [
        'Kappa! Kappa! Học thôi!',
        'Nước mát quá! Cậu có muốn bơi không?',
        'Học một chút rồi nghỉ nhé!',
        'Tớ biết nhiều chuyện thú vị lắm!',
        'Bơi trong biển kiến thức nào!',
      ],
      happy: [
        'Ehehe! Vui quá đi!',
        'Cậu là người bạn tuyệt vời nhất!',
        'Kappa vui tới nhảy múa đây!',
      ],
      sad: [
        'Chán quá đi... chẳng có ai chơi cùng...',
        'Nước mắt kappa chảy thành sông...',
        'Tớ buồn lắm đó!',
      ],
      evolution: [
        'KAPPA MẠNH HƠN RỒIII!',
        'Ú òa! Tớ thấy mình lớn hơn!',
        'Cảm ơn cậu! Kappa sẽ cố gắng!',
      ],
      feed: [
        'Ngon ơi là ngon! Cảm ơn!',
        'Kappa thích ăn lắm!',
        'Dưa chuột ngon nhất!',
      ],
      pet: [
        'Kyaa! Nhột!',
        'Nữa đi nữa đi!',
        'Hehe tớ thích lắm!',
      ],
      conversation: {
        greeting: ['Chào cậu! Hôm nay tắm ở đâu thế?', 'Kappa! Kappa! Cậu khỏe không?'],
        study: ['Học trong nước mát lắm! Cùng nhau ngâm kiến thức nào!', 'Kappa! Tớ cũng học nè!'],
        mood: ['Nước mát quá! Tớ vui lắm!', 'Khỏe re! Vừa bơi một vòng xong!'],
        story: ['Có một lần tớ cứu một cậu bé khỏi sông... Ấy, sao lại kể chuyện cũ của mình nhỉ?', 'Dưa chuột... ơ kể gì đâu!'],
        bye: ['Tạm biệt! Nhớ quay lại tắm cùng tớ nhé!', 'Kappa bye bye!'],
        free: ['Kappa kappa!', 'Ồ hay quá!', 'Tớ cũng nghĩ thế!'],
      },
    },
    stages: '🫧 → 🫧👶 → 🐢 → 🐢💧',
  },
  karasu: {
    id: 'karasu',
    name: 'Karasu',
    description: 'Quạ đen huyền bí — từ quả trứng nhỏ thành Yatagarasu, quạ ba chân huyền thoại.',
    emoji: '🐦⬛',
    moodEmojis: { happy: '🐦⬛', content: '🐦⬛✨', hungry: '🐦⬛💦', tired: '🐦⬛😴', sad: '🐦⬛💧' },
    gradient: 'from-slate-700 to-zinc-900',
    color: 'text-zinc-700',
    bgColor: 'bg-zinc-50',
    borderColor: 'border-zinc-200',
    ringColor: 'ring-zinc-400',
    personality: ['Bí ẩn', 'Thông thái', 'Tự lập', 'Sắc sảo'],
    messages: {
      idle: [
        'Kaw! Kaw! Có bài mới kìa!',
        'Tri thức là sức mạnh, cậu biết không?',
        'Một ngày không học là một ngày phí...',
        'Ta thấy cậu hôm nay rất chăm chỉ!',
        'Bay cao nào!',
      ],
      happy: [
        'Kaw kaw! Tuyệt vời!',
        'Ta rất hài lòng về cậu!',
        'Cảm xúc thật tuyệt!',
      ],
      sad: [
        'Kaw... buồn quá...',
        'Cô đơn trên cành cây cao...',
        'Cậu quên ta rồi sao?',
      ],
      evolution: [
        'TA THẤY TẤT CẢ! Cảm ơn cậu!',
        'Sức mạnh mới! Bay cao hơn nữa!',
        'Kaw! Cấp độ mới! Cùng chinh phục!',
      ],
      feed: [
        'Ta rất trân trọng bữa ăn này!',
        'Kaw! Đồ ăn ngon!',
        'Bổ dưỡng quá!',
      ],
      pet: [
        'Ừm... cũng dễ chịu...',
        'Tiếp tục đi... ta cho phép...',
        'Hm... được lắm...',
      ],
      conversation: {
        greeting: ['Kaw! Cậu đã đến! Ta quan sát cậu từ trên cao nãy giờ!', 'Chào cậu, hôm nay cậu học gì?'],
        study: ['Kaw! Tri thức đang chờ! Bay cao nào!', 'Thông thái như quạ, chăm chỉ như cậu!'],
        mood: ['Ta hài lòng với sự chăm chỉ của cậu.', 'Tâm trạng ta tốt khi thấy cậu học tập!'],
        story: ['Kaw... có một truyền thuyết về Yatagarasu, con quạ ba chân dẫn đường cho thần thánh...', 'Những cánh quạ bay qua bầu trời, mang theo bí mật của vũ trụ...'],
        bye: ['Kaw! Hẹn gặp lại! Bay cao nhé!', 'Tạm biệt! Đừng quên ôn bài!'],
        free: ['Kaw! Ta thấy thú vị!', 'Ta suy ngẫm về điều đó...', 'Sâu sắc đấy!'],
      },
    },
    stages: '🥚 → 🐦 → 🐦⬛ → 🐦⬛🌞',
  },
  maneki_neko: {
    id: 'maneki_neko',
    name: 'Maneki Neko',
    description: 'Mèo may mắn — vẫy gọi tài lộc và hạnh phúc đến với người chủ chăm chỉ.',
    emoji: '🐱',
    moodEmojis: { happy: '🐱', content: '🐱✨', hungry: '🐱💦', tired: '🐱😴', sad: '🐱💧' },
    gradient: 'from-amber-300 to-yellow-600',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    ringColor: 'ring-amber-300',
    personality: ['Dễ thương', 'May mắn', 'Ấm áp', 'Thích được cưng'],
    messages: {
      idle: [
        'Nyaa~ Học thôi nào!',
        'Cố gắng lên nhé chủ nhân!',
        'Tớ sẽ vẫy tay chúc may mắn cho cậu!',
        'Học tập mang lại may mắn đó!',
        'Ngoan ngoãn học bài nhé!',
      ],
      happy: [
        'Nyaaaa! Hạnh phúc quá!',
        'May mắn đang đến với chúng ta!',
        'Purrr... Tớ thích cậu lắm!',
      ],
      sad: [
        'Nyaa... chủ nhân bỏ rơi tớ...',
        'Tớ nhớ cậu lắm... về sớm nhé...',
        'Buồn quá... chẳng có ai chơi cùng...',
      ],
      evolution: [
        'NYAAA! May mắn nhân đôi!',
        'Tớ đẹp hơn rồi! Cảm ơn chủ nhân!',
        'Tài lộc đang gõ cửa!',
      ],
      feed: [
        'Nya~ Ngon quá! Cảm ơn!',
        'Đây là món tớ thích nhất!',
        'Ăn ngon quá! Chủ nhân ăn cùng nhé!',
      ],
      pet: [
        'Purrrrrr~ Ấm áp quá...',
        'Nyaa~ Cưng tiếp đi ạ!',
        'Tớ thích được vuốt ve lắm!',
      ],
      conversation: {
        greeting: ['Nyaa~ Chủ nhân đến rồi! Tớ chờ cậu lâu lắm!', 'Chào chủ nhân! Hôm nay cậu có may mắn không?'],
        study: ['Chăm chỉ quá! Tớ vẫy tay chúc may mắn cho cậu đây!', 'Nyaa! Học đi chủ nhân!'],
        mood: ['Tớ khỏe lắm! Tớ vừa mơ thấy cá hồi nướng!', 'Có chủ nhân ở đây là tớ vui rồi!'],
        story: ['Có một chú mèo may mắn ở Nhật Bản... ơ mà đó là tớ mà!', 'Cậu biết không, tớ có thể vẫy tay mang lại may mắn đó!'],
        bye: ['Nyaa~ Chủ nhân đi à? Nhớ quay lại sớm nhé!', 'Tạm biệt! May mắn sẽ đến với cậu!'],
        free: ['Nyaa~ Thế à!', 'Purrr... nghe hay đấy!', 'Cậu nói đúng đó!'],
      },
    },
    stages: '🐱 → 🐱💰 → 🐱👑',
  },
  usagi: {
    id: 'usagi',
    name: 'Usagi',
    description: 'Thỏ mặt trăng — chú thỏ nhỏ nhảy từ trần gian lên cung trăng để giã bánh mochi.',
    emoji: '🐰',
    moodEmojis: { happy: '🐰', content: '🐰🌸', hungry: '🐰💦', tired: '🐰😴', sad: '🐰💧' },
    gradient: 'from-pink-300 to-purple-400',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    ringColor: 'ring-pink-300',
    personality: ['Dễ thương', 'Nhút nhát', 'Chăm chỉ', 'Mơ mộng'],
    messages: {
      idle: [
        'Nháy nháy... hôm nay học gì thế?',
        'Tớ đang giã bánh mochi trên cung trăng!',
        'Cùng nhau cố gắng nhé!',
        'Học tập vui như nhảy trên mây!',
        'Cậu chăm chỉ lắm! Tớ ngưỡng mộ cậu!',
      ],
      happy: [
        'Nhảy nhảy! Vui quá đi!',
        'Cảm ơn cậu! Tớ thích cậu lắm!',
        'Hôm nay là ngày tuyệt vời nhất!',
      ],
      sad: [
        'Tủi thân quá... tớ muốn về cung trăng...',
        'Cậu không thương tớ nữa sao?',
        'Hu hu... tớ buồn lắm...',
      ],
      evolution: [
        'Ú òa! Tớ lớn hơn rồi!',
        'Cảm ơn cậu nhiều lắm!',
        'Cùng nhau bay lên cung trăng nhé!',
      ],
      feed: [
        'Nhai nhai... ngon quá ạ!',
        'Cảm ơn cậu đã cho tớ ăn!',
        'Thức ăn ngon làm tớ vui lắm!',
      ],
      pet: [
        'Nhéo nhéo... dễ chịu quá...',
        'Tớ thích được âu yếm!',
        'Ấm áp lắm... đừng dừng lại mà...',
      ],
      conversation: {
        greeting: ['Chào cậu! Tớ đang giã bánh mochi trên cung trăng nè!', 'Nhảy nhảy! Cậu đến chơi cùng tớ à?'],
        study: ['Học chăm thế! Tớ sẽ giã bánh mochi tiếp sức cho cậu!', 'Cậu chăm chỉ làm tớ ngưỡng mộ!'],
        mood: ['Tớ vui như đang nhảy trên mây ấy!', 'Mơ mộng chút thôi... tuyệt lắm!'],
        story: ['Trên cung trăng có một chú thỏ đang giã bánh mochi... à đó là tớ!', 'Ngắm trăng đẹp quá! Cậu có muốn lên đó không?'],
        bye: ['Tạm biệt cậu! Tớ sẽ lên cung trăng chờ cậu!', 'Hẹn gặp lại! Ngủ ngon nhé!'],
        free: ['Hihi, dễ thương quá!', 'Nhéo nhéo~ tớ thích lắm!', 'Cậu nói hay ghê!'],
      },
    },
    stages: '🐰 → 🐰🌸 → 🐰🌙',
  },
};

export const PET_TYPE_LIST = Object.values(PET_TYPES);

export const PET_ID_TO_CONFIG = PET_TYPE_LIST.reduce<Record<string, PetTypeConfig>>(
  (acc, config) => { acc[config.id] = config; return acc; },
  {}
);

export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  costXp: number;
  happinessBonus: number;
  petXpBonus: number;
  hungerRestore: number;
  category: 'main' | 'snack' | 'drink' | 'special' | 'consumable';
  hpRestore?: number;
  staminaRestore?: number;
  isRevive?: boolean;
}

export const FOOD_ITEMS: FoodItem[] = [
  {
    id: 'onigiri',
    name: 'Onigiri',
    emoji: '🍙',
    description: 'Cơm nắm Nhật Bản đơn giản mà ngon',
    costXp: 50,
    happinessBonus: 15,
    petXpBonus: 20,
    hungerRestore: 35,
    category: 'main',
  },
  {
    id: 'sushi',
    name: 'Sushi',
    emoji: '🍣',
    description: 'Sushi tươi ngon, pet sẽ rất thích',
    costXp: 80,
    happinessBonus: 20,
    petXpBonus: 30,
    hungerRestore: 50,
    category: 'main',
  },
  {
    id: 'ramen',
    name: 'Ramen',
    emoji: '🍜',
    description: 'Tô mì nóng hổi, bổ sung năng lượng',
    costXp: 100,
    happinessBonus: 25,
    petXpBonus: 40,
    hungerRestore: 70,
    category: 'main',
  },
  {
    id: 'dango',
    name: 'Dango',
    emoji: '🍡',
    description: 'Bánh tròn ngọt ngào, pet nhảy múa vui vẻ',
    costXp: 60,
    happinessBonus: 18,
    petXpBonus: 25,
    hungerRestore: 30,
    category: 'snack',
  },
  {
    id: 'matcha',
    name: 'Matcha',
    emoji: '🍵',
    description: 'Trà xanh thư giãn, giúp pet tỉnh táo',
    costXp: 40,
    happinessBonus: 10,
    petXpBonus: 15,
    hungerRestore: 20,
    category: 'drink',
  },
  {
    id: 'taiyaki',
    name: 'Taiyaki',
    emoji: '🐟',
    description: 'Bánh cá nướng thơm lừng, pet cực kỳ yêu thích',
    costXp: 120,
    happinessBonus: 30,
    petXpBonus: 50,
    hungerRestore: 60,
    category: 'snack',
  },
  {
    id: 'mochi',
    name: 'Mochi',
    emoji: '🍡',
    description: 'Bánh mochi dẻo thơm, pet cảm thấy ấm áp',
    costXp: 70,
    happinessBonus: 22,
    petXpBonus: 20,
    hungerRestore: 40,
    category: 'special',
  },
  {
    id: 'tempura',
    name: 'Tempura',
    emoji: '🍤',
    description: 'Tôm chiên giòn rụm, pet thích mê',
    costXp: 90,
    happinessBonus: 22,
    petXpBonus: 35,
    hungerRestore: 55,
    category: 'main',
  },
  {
    id: 'soba',
    name: 'Soba',
    emoji: '🍜',
    description: 'Mì soba mát lạnh, thanh nhẹ',
    costXp: 60,
    happinessBonus: 15,
    petXpBonus: 25,
    hungerRestore: 45,
    category: 'main',
  },
  {
    id: 'udon',
    name: 'Udon',
    emoji: '🍝',
    description: 'Mì udon dai ngon, nước dùng đậm đà',
    costXp: 85,
    happinessBonus: 20,
    petXpBonus: 30,
    hungerRestore: 60,
    category: 'main',
  },
  {
    id: 'takoyaki',
    name: 'Takoyaki',
    emoji: '🐙',
    description: 'Bánh bạch tuộc nóng hổi, pet nhảy cẫng lên',
    costXp: 75,
    happinessBonus: 25,
    petXpBonus: 28,
    hungerRestore: 35,
    category: 'snack',
  },
  {
    id: 'yakisoba',
    name: 'Yakisoba',
    emoji: '🥟',
    description: 'Mì xào thập cẩm thơm ngon',
    costXp: 80,
    happinessBonus: 18,
    petXpBonus: 32,
    hungerRestore: 50,
    category: 'main',
  },
  {
    id: 'sakura_mochi',
    name: 'Sakura Mochi',
    emoji: '🌸',
    description: 'Bánh mochi vị hoa anh đào, tinh tế và ngọt ngào',
    costXp: 65,
    happinessBonus: 28,
    petXpBonus: 22,
    hungerRestore: 25,
    category: 'special',
  },
  {
    id: 'ramune',
    name: 'Ramune',
    emoji: '🥤',
    description: 'Nước ngọt Nhật Bản, giải khát mùa hè',
    costXp: 30,
    happinessBonus: 8,
    petXpBonus: 10,
    hungerRestore: 10,
    category: 'drink',
  },
  {
    id: 'calpis',
    name: 'Calpis',
    emoji: '🥛',
    description: 'Sữa chua uống thơm mát, pet yêu thích',
    costXp: 35,
    happinessBonus: 10,
    petXpBonus: 12,
    hungerRestore: 15,
    category: 'drink',
  },
  {
    id: 'kakigori',
    name: 'Kakigori',
    emoji: '🍧',
    description: 'Đá bào Nhật Bản, ngọt lạnh và vui nhộn',
    costXp: 45,
    happinessBonus: 20,
    petXpBonus: 18,
    hungerRestore: 20,
    category: 'drink',
  },
  {
    id: 'dorayaki',
    name: 'Dorayaki',
    emoji: '🥞',
    description: 'Bánh rán truyền thống, thơm mùi đậu đỏ',
    costXp: 55,
    happinessBonus: 25,
    petXpBonus: 20,
    hungerRestore: 35,
    category: 'snack',
  },
  {
    id: 'anmitsu',
    name: 'Anmitsu',
    emoji: '🍨',
    description: 'Tráng miệng thạch thập cẩm, ngọt mát',
    costXp: 70,
    happinessBonus: 22,
    petXpBonus: 25,
    hungerRestore: 30,
    category: 'snack',
  },
  {
    id: 'omurice',
    name: 'Omurice',
    emoji: '🍳',
    description: 'Cơm trứng bọc bên ngoài, sốt cà chua ngon tuyệt',
    costXp: 95,
    happinessBonus: 25,
    petXpBonus: 35,
    hungerRestore: 65,
    category: 'main',
  },
  {
    id: 'health_potion',
    name: 'Thuốc Hồi Phục',
    emoji: '🧪',
    description: 'Hồi phục 50 HP ngay lập tức.',
    costXp: 150,
    happinessBonus: 5,
    petXpBonus: 10,
    hungerRestore: 0,
    hpRestore: 50,
    category: 'consumable',
  },
  {
    id: 'stamina_drink',
    name: 'Nước Tăng Lực',
    emoji: '⚡',
    description: 'Hồi 30 Thể lực để tiếp tục viễn chinh.',
    costXp: 100,
    happinessBonus: 2,
    petXpBonus: 5,
    hungerRestore: 0,
    staminaRestore: 30,
    category: 'consumable',
  },
  {
    id: 'revive_herb',
    name: 'Cỏ Hồi Sinh',
    emoji: '🌿',
    description: 'Hồi sinh Pet từ trạng thái ngất xỉu (20% HP).',
    costXp: 500,
    happinessBonus: 50,
    petXpBonus: 100,
    hungerRestore: 0,
    isRevive: true,
    category: 'consumable',
  },
];

export const FOOD_MAP = FOOD_ITEMS.reduce<Record<string, FoodItem>>(
  (acc, item) => { acc[item.id] = item; return acc; },
  {},
);

export function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}
