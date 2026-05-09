# 🌸 AI Analysis Framework — Sensei Skill v1

> Tài liệu khung để tái sử dụng khi xây các tính năng AI phân tích ngôn ngữ (Nhật/Anh/...) sau này.
> Lưu tại `docs/AI_ANALYSIS_FRAMEWORK.md`. Update khi học được pattern mới.

---

## 1. Triết lý cốt lõi

| Nguyên tắc | Diễn giải |
|---|---|
| **Layered Intelligence** | Mỗi tác vụ có nhiều tầng: dữ liệu cứng (offline DB) → heuristic (rule-based) → AI nhỏ (fast) → AI lớn (deep). Luôn fallback xuống tầng dưới. |
| **Progressive Disclosure** | Trả overview tức thì, deep analysis chạy nền. User không bao giờ chờ màn trắng. |
| **Save & Reuse** | AI output là tài sản — cache theo content hash vào DB để tiết kiệm token. |
| **Schema-First** | Bắt buộc structured output (tool calling / JSON schema) thay vì parse free-text → tránh `undefined.map` runtime crash. |
| **Defensive Render** | Mọi field optional chaining + Error Boundary + fallback UI. AI có thể trả thiếu field bất cứ lúc nào. |
| **Source Transparency** | UI luôn cho biết nguồn của thông tin (NHK / AI dự đoán / cache). User cần biết để tin tưởng. |

---

## 2. Kiến trúc tổng thể

```text
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Trigger UI   │→ │ State Layer  │→ │ Render Layer     │   │
│  │ (button/tab) │  │ (two-pass)   │  │ (panel/tabs)     │   │
│  └──────────────┘  └──────┬───────┘  └────────┬─────────┘   │
│                           │                    │            │
│                           ▼                    ▼            │
│              ┌──────────────────┐   ┌──────────────────┐    │
│              │ Offline Lookup   │   │ Error Boundary   │    │
│              │ (IndexedDB+JSON) │   │ + Fallback UI    │    │
│              └──────────────────┘   └──────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │ supabase.functions.invoke
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                EDGE FUNCTION (Deno)                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │ Validate    │→ │ Cache Check  │→ │ Model Router     │    │
│  │ (Zod)       │  │ (DB hash)    │  │ (task→model)     │    │
│  └─────────────┘  └──────────────┘  └────────┬─────────┘    │
│                                              │              │
│                       ┌──────────────────────┼─────────┐    │
│                       ▼                      ▼         ▼    │
│                 ┌──────────┐          ┌──────────┐  ┌────┐  │
│                 │ Lovable  │          │ Groq     │  │... │  │
│                 │ AI GW    │          │ (rotate) │  │    │  │
│                 └────┬─────┘          └────┬─────┘  └────┘  │
│                      │                     │                │
│                      └──────────┬──────────┘                │
│                                 ▼                           │
│                      ┌──────────────────┐                   │
│                      │ Sanitize + Save  │                   │
│                      │ to cache + return│                   │
│                      └──────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Pipeline phân tích (Two-Pass)

```text
T+0ms    User click "Phân tích"
T+0ms    UI render skeleton (3 tabs blurred)
T+0ms    Overview request → fast model (Llama-8B / Flash-Lite)
T+800ms  Overview returns → render JLPT, summary, register, dialect
T+800ms  Deep request fires in background → 70B / Pro model
T+5s     Deep returns → merge into state → render breakdown + grammar
T+5s     Cache to DB (content_hash, structured_data)
```

**Quy tắc:**
- Pass 1 (overview) phải < 1.5s — chỉ ~100 token output.
- Pass 2 (deep) là tool-call với schema strict.
- Mỗi pass có error boundary riêng — pass 1 fail không chặn pass 2.

---

## 4. Layered Lookup Strategy

Áp dụng được cho **bất kỳ feature nào cần dữ liệu chuẩn + AI dự đoán** (NHK pitch là ví dụ).

```text
Layer 0: Memory cache (Map) ──── instant
   ↓ miss
Layer 1: IndexedDB ──────────── ~50ms
   ↓ miss
Layer 2: Static asset (TSV/JSON) — fetch once, ~3MB OK
   ↓ miss
Layer 3: Heuristic (rule-based)  — strip okurigana, kana variants, infer reading
   ↓ miss
Layer 4: AI dự đoán (LLM)        — đánh dấu rõ "AI guess" (nét đứt + badge)
   ↓ miss
Layer 5: UI báo "không có dữ liệu" + lý do cụ thể
```

**Mỗi miss phải có `reason`** (`loading | not-found | no-input | load-error`) để UI hiển thị lý do, không câm lặng.

---

## 5. Prompt Engineering Framework

### 5.1 Cấu trúc system prompt chuẩn

```text
1. ROLE        — "Bạn là chuyên gia X chuyên cho người Y"
2. TASK        — Một câu mô tả nhiệm vụ
3. RULES       — Quy tắc bắt buộc (đánh số 1,2,3)
4. OUTPUT      — JSON schema EXACT (kèm comment)
5. CONSTRAINTS — "Trả về ONLY JSON", "tiếng Việt giải thích"
```

### 5.2 Multi-task routing trong 1 function

```text
task: "analyze"   → ENHANCED_SYSTEM_PROMPT
task: "grammar"   → GRAMMAR_SYSTEM_PROMPT
task: "rewrite"   → REWRITE_SYSTEM_PROMPT (politeness/jlpt)
task: "etymology" → ETYMOLOGY_SYSTEM_PROMPT
task: "vision"    → VISION_SYSTEM_PROMPT
```

→ Một edge function, nhiều prompt, model router quyết định model theo `task + reasoning_mode`.

### 5.3 Reasoning modes (UX chip)

| Mode | Model tier | Use case |
|---|---|---|
| 速 fast | 8B / Flash-Lite | Click nhanh, browsing |
| 標 standard | 70B / Flash | Mặc định |
| 深 deep | Reasoning model (R1 / GPT-5) | Khi user chủ động chọn "Sensei mode" |

Persist lựa chọn vào `localStorage`.

---

## 6. Schema Defensive Pattern

```text
Backend trả về:    { structured: {...}, raw: "...", format: "json" }
Client validate:   parseStructured(data) → null nếu thiếu field core
Render layer:
   - Optional chain mọi truy cập:  obj?.a?.b?.length ?? 0
   - Map array với fallback:       (arr ?? []).map(...)
   - Error Boundary bọc panel
   - Nút "Thử lại phân tích" khi structured = null
```

**Anti-pattern cần tránh:** `data.grammar.key_patterns.map(...)` ← crash ngay khi AI thiếu field.

---

## 7. Component Anatomy (AnalysisPanel pattern)

```text
<AnalysisErrorBoundary>
  <Sheet/Panel>
    ├─ Header (title + close + Sensei mode chips)
    ├─ Loading skeleton (animated, 3 tabs preview)
    ├─ Tabs:
    │   ├─ Overview     — JLPT, register, dialect, summary
    │   ├─ Breakdown    — per-sentence words (PitchAccent + Etymology popover)
    │   ├─ Grammar      — patterns + deep-dive expand
    │   ├─ Flashcards   — suggested cards + Save to folder
    │   └─ Tools        — SenseiRewrite (politeness/JLPT compare)
    └─ Footer (regenerate / save / export)
</AnalysisErrorBoundary>
```

**Mỗi sub-component phải:**
- Tự quản lý loading riêng (không kéo cả panel xuống).
- Hiển thị nguồn dữ liệu (NHK / AI / Cache) qua badge nhỏ.
- Có affordance "click sâu hơn" (popover etymology, expand pattern).

---

## 8. Caching & Storage Strategy

| Loại dữ liệu | Nơi lưu | Key | TTL |
|---|---|---|---|
| AI structured analysis | Supabase table | `sha256(content)` | Vĩnh viễn |
| Etymology per word | Memory Map | `word` | Session |
| Pitch dataset (3MB) | IndexedDB | `kanjium-v1` | Cho đến đổi version |
| User preferences (mode chip) | localStorage | `sensei_mode` | Vĩnh viễn |
| Conversation history (chat) | Supabase + state | `conversation_id` | Vĩnh viễn |

**Quy tắc:** asset > 1MB → IndexedDB; metadata < 100KB → localStorage; structured AI output → DB.

---

## 9. Error & Empty-State Matrix

| Tình huống | UI |
|---|---|
| Network fail | Toast + nút "Thử lại" |
| AI trả invalid JSON | Fallback "raw text" view + log warning |
| AI thiếu field | Render phần có, ẩn phần thiếu, badge "incomplete" |
| Rate limit (429) | Toast "Nghỉ một chút nhé Sensei", disable trong 30s |
| Credits hết (402) | Modal hướng dẫn nạp credit |
| Dataset offline chưa load | Skeleton inline + fallback AI guess |
| User chưa đăng nhập | CTA login đẹp, không crash |

---

## 10. Extensibility Checklist (template cho task mới)

Khi thêm 1 capability mới, hỏi đủ 10 câu:

1. **Có offline data nguồn không?** → Layer 0–2.
2. **Heuristic được không?** → Layer 3.
3. **AI task name?** → Thêm vào router, viết system prompt riêng.
4. **Schema output?** → Định nghĩa interface TS + tool-call schema.
5. **Cache key?** → Hash input nào?
6. **UI affordance?** → Inline badge, popover, hay tab mới?
7. **Source label?** → User thấy nguồn nào?
8. **Error fallback?** → Component nhỏ nhất bị fail thì degrade ra sao?
9. **Telemetry?** → Có cần đo latency / hit rate?
10. **Cost model?** → Mỗi lần gọi tốn bao nhiêu token, có cần debounce?

---

## 11. Lessons Learned (rules of thumb)

- **Đừng tin AI luôn trả đủ field** → optional chain + Zod validate ở backend nếu critical.
- **Đừng buffer SSE bằng `\n\n` split** → parse line-by-line, JSON có thể span chunks.
- **Đừng push assistant message mới mỗi token** → update message cuối.
- **Đừng cache theo timestamp** → cache theo `hash(content + task + mode)`.
- **Đừng hardcode model name trong prompt** → router function trả model.
- **Đừng trộn nhiều prompt vào 1 system message** → tách theo task, dùng `task` flag.
- **Đừng quên CORS preflight (OPTIONS)** trong edge function.
- **Đừng skip "vì sao miss"** → user cần biết để hành động (dạy app, retry, đổi mode).
- **Đừng để file > 5MB lọt vào Workbox precache** → set `globIgnores` hoặc `maximumFileSizeToCacheInBytes`.
- **Đừng quên prefetch dataset** khi panel mount → user click word đầu tiên đã sẵn.

---

## 12. Reusable Primitives Checklist

Khi build feature mới, tái sử dụng các primitive này:

- [x] `AnalysisErrorBoundary` — bọc bất kỳ AI render block
- [x] `lookupWithLayers(input, layers[])` — generic layered lookup
- [x] `useTwoPassQuery(overviewFn, deepFn)` — hook cho progressive disclosure
- [x] `SourceBadge` — NHK / AI / Cache / Beta
- [x] `MissReasonTooltip` — show miss reason
- [x] `JapaneseText` (max '3xl') — render kanji + furigana
- [x] `IndexedDBCache<T>` — generic wrapper
- [x] `ModelRouter(task, mode)` — backend model selection
- [x] `extractJSON(rawText)` — robust JSON parser cho AI response

---

## 13. File Map (implementation hiện tại)

| Mục đích | File |
|---|---|
| Edge function tổng | `supabase/functions/japanese-analysis/index.ts` |
| Panel chính | `src/components/video/AnalysisPanel.tsx` |
| Error boundary | `src/components/video/AnalysisErrorBoundary.tsx` |
| Pitch accent visual | `src/components/video/PitchAccent.tsx` |
| Pitch lookup (NHK + IDB + heuristic) | `src/lib/pitchAccent.ts` |
| Etymology popover | `src/components/video/WordEtymology.tsx` |
| Rewrite tools | `src/components/video/SenseiRewriteTools.tsx` |
| Reading orchestrator (two-pass) | `src/pages/(learning)/Reading.tsx` |
| Dataset offline | `public/data/pitch-accents.tsv` |

---

## Tóm gọn 1 dòng

> **Layered data → Two-pass AI → Schema-strict → Defensive render → Transparent source → Cached forever.**
