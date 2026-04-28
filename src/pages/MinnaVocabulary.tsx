import { useState, useRef, useCallback } from "react";
import { MINNA_N5_VOCAB } from "@/data/minna-n5";
import { VocabWord } from "@/types/vocabulary";
import { supabase } from "@/integrations/supabase/client";
import { useFlashcardFolders } from "@/hooks/useFlashcardFolders";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

/* ─── Types ──────────────────────────────────────────────────────────── */
interface ExtractedWord {
  word: string;
  reading?: string;
  meaning: string;
  language?: string;
  part_of_speech?: string;
  example?: string;
  level?: string;
}

/* ─── Lesson meta ─────────────────────────────────────────────────────── */
const LESSON_NAMES = [
  "Giới thiệu bản thân","Đây là cái gì?","Ở đâu?","Mấy giờ?","Đi đâu?",
  "Ăn gì?","Cho / Tặng","Tính từ","Thích / Ghét","Có / Không có",
  "Đếm số","So sánh","Muốn làm gì?","Nhờ làm gì?","Biết / Sống ở đâu",
  "Hình dáng","Phép tắc","Đang làm","Muốn đến đâu","Thử làm",
  "Chuẩn bị xong","Điều kiện","Khi / Trước / Sau","Cho phép / Cấm","Phải làm",
];
const LESSON_EMOJI = [
  "🌸","🍡","⛩️","🎋","🎐","🍣","🎎","🌺","🎵","🏮",
  "🌼","❄️","🎌","📖","🏯","👘","📝","🎯","🗾","🌿",
  "🍵","🌊","⏰","🎊","✨",
];

/* ─── Shared UI helpers ───────────────────────────────────────────────── */
const ProgressBar = ({ active }: { active: boolean }) =>
  active ? (
    <div className="w-full h-1 bg-pink-100 rounded-full overflow-hidden">
      <div className="h-full bg-gradient-to-r from-pink-400 to-purple-400 rounded-full animate-[slide_1.4s_ease-in-out_infinite]" />
      <style>{`@keyframes slide{0%{width:0%;margin-left:0}50%{width:60%;margin-left:20%}100%{width:0%;margin-left:100%}}`}</style>
    </div>
  ) : null;

const DownloadJSON = ({ data, filename }: { data: ExtractedWord[]; filename: string }) => (
  <button
    onClick={() => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }}
    className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium px-4 py-2 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200"
  >
    ⬇ Tải JSON
  </button>
);

/* ─── Tab 1: Lesson Browser ───────────────────────────────────────────── */
function LessonBrowser() {
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const lessons = MINNA_N5_VOCAB;
  const currentWords: VocabWord[] = selectedLesson !== null ? (lessons[selectedLesson] ?? []) : [];

  if (selectedLesson !== null) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => { setSelectedLesson(null); setFlippedCard(null); }}
            className="flex items-center gap-2 text-sm text-pink-600 bg-white/70 border border-pink-200 rounded-full px-4 py-2 hover:bg-pink-50 transition-all"
          >
            ← Quay lại
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Bài {selectedLesson + 1}: {LESSON_NAMES[selectedLesson]}</h2>
            <p className="text-xs text-gray-400">{currentWords.length} từ · Nhấn thẻ để xem nghĩa</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentWords.map((word) => {
            const isFlipped = flippedCard === word.id;
            return (
              <button
                key={word.id}
                onClick={() => setFlippedCard(isFlipped ? null : word.id)}
                className={`relative text-left rounded-2xl p-5 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  isFlipped
                    ? "bg-gradient-to-br from-pink-500 to-purple-500 border-transparent text-white shadow-lg"
                    : "bg-white/70 backdrop-blur-sm border-pink-100 hover:border-pink-300"
                }`}
              >
                {!isFlipped ? (
                  <>
                    <p className="text-2xl font-bold text-gray-800 mb-1">{word.word}</p>
                    <p className="text-sm text-pink-500">{word.reading}</p>
                    {word.hanviet && <p className="text-xs text-gray-400 mt-1 italic">{word.hanviet}</p>}
                    <div className="absolute bottom-3 right-4 text-gray-200 text-xs">nhấn →</div>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-white mb-1">{word.word}</p>
                    <p className="text-sm text-pink-100 mb-2">{word.reading}</p>
                    <p className="text-base font-bold text-white">{word.meaning}</p>
                    {word.hanviet && <p className="text-xs text-pink-200 mt-1 italic">Hán Việt: {word.hanviet}</p>}
                    {word.example && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-xs text-pink-100">{word.example}</p>
                        <p className="text-xs text-pink-200 italic mt-1">{word.exampleMeaning}</p>
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {LESSON_NAMES.map((name, i) => (
        <button
          key={i}
          onClick={() => setSelectedLesson(i)}
          className="group relative bg-white/70 backdrop-blur-sm border border-pink-100 rounded-2xl p-4 text-left hover:bg-pink-50 hover:border-pink-300 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
        >
          <div className="text-2xl mb-2">{LESSON_EMOJI[i]}</div>
          <p className="text-xs font-bold text-pink-600 mb-1">Bài {i + 1}</p>
          <p className="text-xs text-gray-500 leading-tight line-clamp-2">{name}</p>
          <div className="absolute bottom-2 right-3 text-xs text-gray-300 group-hover:text-pink-400 transition-colors">
            {lessons[i]?.length ?? 0} từ
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Tab 2: Image Extractor ──────────────────────────────────────────── */
function ImageExtractor() {
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [wordCount, setWordCount] = useState(10);
  const [autoMode, setAutoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null); setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null); setError(null);
  }, []);

  const analyze = async () => {
    if (!image) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const prompt = autoMode
        ? `Analyze this image and extract ALL vocabulary words visible or related to objects in the image. Return a JSON array of objects with fields: word, reading (if Japanese), meaning (in Vietnamese), language, part_of_speech, level (JLPT N5-N1 or CEFR A1-C2).`
        : `Analyze this image and extract exactly ${wordCount} vocabulary words related to objects, scenes, or text visible in the image. Return a JSON array of ${wordCount} objects with fields: word, reading (if Japanese), meaning (in Vietnamese), language, part_of_speech, level (JLPT N5-N1 or CEFR A1-C2).`;

      const { data, error: fnError } = await supabase.functions.invoke("ai-explain", {
        body: {
          type: "image_vocab",
          imageBase64: image.split(",")[1],
          imageType: image.split(";")[0].split(":")[1],
          prompt,
          wordCount: autoMode ? "auto" : wordCount,
        },
      });

      if (fnError) throw new Error(fnError.message);

      // Parse JSON from edge function response — returns { result: "[...]" }
      let words: ExtractedWord[] = [];
      const raw: string = data?.result ?? (typeof data === "string" ? data : JSON.stringify(data));
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        words = JSON.parse(match[0]);
      } else {
        throw new Error("Không thể phân tích phản hồi AI");
      }
      setResult(words);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="relative border-2 border-dashed border-pink-200 rounded-2xl p-8 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50/50 transition-all group"
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        {image ? (
          <div className="space-y-3">
            <img src={image} alt="preview" className="max-h-48 mx-auto rounded-xl shadow-md object-contain" />
            <p className="text-xs text-gray-400">{imageName} · Nhấn để đổi ảnh</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-5xl group-hover:scale-110 transition-transform">📷</div>
            <p className="text-gray-500 font-medium">Kéo thả hoặc nhấn để tải ảnh</p>
            <p className="text-xs text-gray-400">PNG, JPG, WEBP · Hỗ trợ tiếng Nhật, Hàn, Trung, Anh...</p>
          </div>
        )}
      </div>

      {/* Controls */}
      {image && (
        <div className="bg-white/60 backdrop-blur-sm border border-pink-100 rounded-2xl p-5 space-y-4">
          {/* Auto mode toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Chế độ</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoMode(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!autoMode ? "bg-pink-500 text-white shadow-md" : "bg-pink-50 text-pink-400 border border-pink-200"}`}
              >
                Tùy chỉnh
              </button>
              <button
                onClick={() => setAutoMode(true)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${autoMode ? "bg-purple-500 text-white shadow-md" : "bg-purple-50 text-purple-400 border border-purple-200"}`}
              >
                ✨ Tự động
              </button>
            </div>
          </div>

          {/* Slider */}
          {!autoMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Số từ muốn lấy</span>
                <span className="text-lg font-bold text-pink-600">{wordCount}</span>
              </div>
              <input
                type="range" min={3} max={50} value={wordCount}
                onChange={(e) => setWordCount(Number(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-300">
                <span>3</span><span>10</span><span>25</span><span>50</span>
              </div>
            </div>
          )}

          {/* Analyze button */}
          <button
            id="img-analyze-btn"
            onClick={analyze}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                </svg>
                Đang phân tích...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Phân tích AI
              </span>
            )}
          </button>
          <ProgressBar active={loading} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {result && <WordResultGrid words={result} filename={`vocab-image-${Date.now()}.json`} />}
    </div>
  );
}

/* ─── Tab 3: Text Analyzer ────────────────────────────────────────────── */
function TextAnalyzer() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractedWord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const prompt = `Analyze the following text and extract all vocabulary words that are important or educational. For each word include: word (original form), reading (if Japanese/Chinese), meaning (in Vietnamese), language (detected language), part_of_speech, a short example sentence, and level (JLPT N5-N1 or CEFR A1-C2). Return ONLY a JSON array.

Text: "${text}"`;

      const { data, error: fnError } = await supabase.functions.invoke("ai-explain", {
        body: { type: "text_vocab", text, prompt },
      });

      if (fnError) throw new Error(fnError.message);

      const raw: string = data?.result ?? (typeof data === "string" ? data : JSON.stringify(data));
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        setResult(JSON.parse(match[0]));
      } else {
        throw new Error("AI không trả về JSON hợp lệ");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Text input */}
      <div className="relative">
        <textarea
          id="text-analysis-input"
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); setError(null); }}
          placeholder="Nhập đoạn văn bất kỳ ở đây... (Nhật, Hàn, Trung, Anh, Việt...)"
          rows={6}
          className="w-full bg-white/70 backdrop-blur-sm border border-pink-200 rounded-2xl p-4 pr-14 text-sm text-gray-700 placeholder-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
        />
        {/* AI Analyze button — icon only */}
        <button
          id="text-analyze-btn"
          onClick={analyze}
          disabled={loading || !text.trim()}
          title="Phân tích AI"
          className="absolute bottom-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-md hover:shadow-pink-300 hover:scale-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
              <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
            </svg>
          ) : (
            /* Sparkle / AI icon */
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
          )}
        </button>
      </div>

      {/* Progress bar */}
      <ProgressBar active={loading} />

      {/* Hint */}
      {!text.trim() && (
        <div className="flex flex-wrap gap-2">
          {[
            "猫はかわいいです。犬も好きです。",
            "벚꽃이 피었습니다. 봄이 왔어요.",
            "The cherry blossoms are in full bloom.",
            "春天樱花盛开，美丽极了。",
          ].map((sample) => (
            <button
              key={sample}
              onClick={() => setText(sample)}
              className="text-xs bg-white/60 border border-pink-100 text-pink-400 px-3 py-1.5 rounded-full hover:bg-pink-50 hover:border-pink-300 transition-all"
            >
              {sample.slice(0, 20)}…
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {result && <WordResultGrid words={result} filename={`vocab-text-${Date.now()}.json`} />}
    </div>
  );
}

/* ─── Shared Result Grid ──────────────────────────────────────────────── */
const LEVEL_COLORS: Record<string, string> = {
  N5: "bg-green-100 text-green-700 border-green-200",
  N4: "bg-blue-100 text-blue-700 border-blue-200",
  N3: "bg-amber-100 text-amber-700 border-amber-200",
  N2: "bg-rose-100 text-rose-700 border-rose-200",
  N1: "bg-purple-100 text-purple-700 border-purple-200",
};
const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

function WordResultGrid({ words, filename }: { words: ExtractedWord[]; filename: string }) {
  const [showRaw, setShowRaw] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const { saveToInbox } = useFlashcardFolders();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const filtered = selectedLevel
    ? words.filter((w) => w.level === selectedLevel)
    : words;

  const handleSave = async (w: ExtractedWord, index: number) => {
    const id = `${w.word}-${index}`;
    setSavingId(id);
    try {
      const result = await saveToInbox({
        word: w.word,
        reading: w.reading || null,
        meaning: w.meaning,
        jlpt_level: w.level,
        example_sentence: w.example,
      });
      if (result) {
        setSavedIds(prev => new Set(prev).add(id));
        toast.success(`Đã lưu "${w.word}" vào Hộp thư đến`);
      }
    } catch (err) {
      toast.error("Không thể lưu từ vựng");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-700">
          ✨ Kết quả: <span className="text-pink-600">{words.length}</span> từ
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs bg-white/60 border border-gray-200 text-gray-500 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-all"
          >
            {showRaw ? "Thẻ từ" : "JSON"}
          </button>
          <DownloadJSON data={words} filename={filename} />
        </div>
      </div>

      {/* Level filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedLevel(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            selectedLevel === null
              ? "bg-pink-500 text-white border-pink-500 shadow-sm"
              : "bg-white/60 text-gray-500 border-gray-200 hover:border-pink-200"
          }`}
        >
          Tất cả
        </button>
        {LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              selectedLevel === level
                ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                : "bg-white/60 text-gray-500 border-gray-200 hover:border-pink-200"
            }`}
          >
            {level}
          </button>
        ))}
        {selectedLevel && filtered.length < words.length && (
          <span className="text-xs text-gray-400 ml-1">
            ({filtered.length}/{words.length})
          </span>
        )}
      </div>

      {showRaw ? (
        <pre className="bg-gray-900 text-green-300 rounded-2xl p-4 text-xs overflow-auto max-h-96">
          {JSON.stringify(words, null, 2)}
        </pre>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          Không có từ nào ở trình độ <span className="font-semibold">{selectedLevel}</span> trong kết quả này.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((w, i) => (
            <div key={i} className="relative bg-white/80 backdrop-blur-sm border border-pink-100 rounded-2xl p-4 hover:shadow-md hover:border-pink-200 transition-all">
              {/* Level badge */}
              {w.level && LEVEL_COLORS[w.level] ? (
                <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLORS[w.level]}`}>
                  {w.level}
                </span>
              ) : (
                <span className="absolute top-2 right-2 text-[10px] text-gray-300 px-2 py-0.5">
                  —
                </span>
              )}
              <div className="flex items-start justify-between mb-1">
                <p className="text-lg font-bold text-gray-800">{w.word}</p>
                {w.language && (
                  <span className="text-xs bg-pink-50 text-pink-500 border border-pink-100 px-2 py-0.5 rounded-full shrink-0 ml-2">
                    {w.language}
                  </span>
                )}
              </div>
              {w.reading && <p className="text-sm text-pink-500 mb-1">{w.reading}</p>}
              <p className="text-sm text-gray-600 font-medium">{w.meaning}</p>
              {w.part_of_speech && (
                <p className="text-xs text-gray-400 italic mt-1">{w.part_of_speech}</p>
              )}
              {w.example && (
                <p className="text-xs text-gray-400 mt-2 pt-2 border-t border-pink-50 line-clamp-2">
                  {w.example}
                </p>
              )}

              <div className="mt-3 pt-3 flex justify-end">
                <button
                  onClick={() => handleSave(w, i)}
                  disabled={savingId === `${w.word}-${i}` || savedIds.has(`${w.word}-${i}`)}
                  className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${
                    savedIds.has(`${w.word}-${i}`)
                      ? "bg-green-50 text-green-600 border border-green-100"
                      : "bg-pink-50 text-pink-600 border border-pink-100 hover:bg-pink-100"
                  }`}
                >
                  {savingId === `${w.word}-${i}` ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : savedIds.has(`${w.word}-${i}`) ? (
                    <BookmarkCheck className="h-3 w-3" />
                  ) : (
                    <Bookmark className="h-3 w-3" />
                  )}
                  {savedIds.has(`${w.word}-${i}`) ? "Đã lưu" : "Lưu vào kho"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────── */
type TabKey = "lessons" | "image" | "text";

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: "lessons", icon: "🌸", label: "Từ vựng theo bài" },
  { key: "image",   icon: "📷", label: "Phân tích ảnh" },
  { key: "text",    icon: "📝", label: "Phân tích văn bản" },
];

export default function MinnaVocabulary() {
  const [tab, setTab] = useState<TabKey>("lessons");
  const lessons = MINNA_N5_VOCAB;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md border border-pink-200 rounded-full px-5 py-2 mb-4 shadow-sm">
            <span className="text-pink-500">🌸</span>
            <span className="text-sm font-medium text-pink-700">みんなの日本語 N5</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Từ vựng Minna no Nihongo
          </h1>
          <p className="text-gray-400 text-sm">
            25 bài · {lessons.reduce((a, b) => a + b.length, 0)} từ · Phân tích ảnh & văn bản AI
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/60 backdrop-blur-md border border-pink-100 rounded-2xl p-1 gap-1 shadow-sm">
            {TABS.map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  tab === key
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md scale-[1.02]"
                    : "text-gray-500 hover:text-pink-600 hover:bg-pink-50"
                }`}
              >
                <span>{icon}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div>
          {tab === "lessons" && <LessonBrowser />}
          {tab === "image"   && <ImageExtractor />}
          {tab === "text"    && <TextAnalyzer />}
        </div>
      </div>
    </div>
  );
}
